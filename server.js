import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve Paths (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. ERROR HANDLING ---
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("🔥 UNHANDLED REJECTION:", reason);
});

// --- 2. MIDDLEWARE ---
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// Global Timeout Protection (5 minutes for long downloads)
app.use((req, res, next) => {
  res.setTimeout(300000, () => {
    console.error(`[Timeout] Request to ${req.url} timed out.`);
    if (!res.headersSent) {
      res.status(504).json({ error: "Request Timeout: The server took too long to respond." });
    }
  });
  next();
});

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 downloads per IP per minute
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- 3. BINARY DETECTION ---
const isWin = process.platform === "win32";
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";
const FFMPEG_PATH = isWin ? path.join(__dirname, "bin", "ffmpeg.exe") : "ffmpeg";

// --- 4. UTILS ---
function extractVideoId(input) {
  if (!input) return null;
  const id = input.trim();
  if (id.length === 11 && /^[0-9A-Za-z_-]{11}$/.test(id)) return id;
  const match = id.match(/(?:v=|\/|be\/|embed\/|watch\?v=)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
}

function sanitizeFilename(name) {
  return (name || "audio")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "download";
}

// --- 5. ENDPOINTS ---

app.get("/api/health", (req, res) => {
  res.json({
    status: "server running"
  });
});

// ROBUST YT-DLP STREAMING DOWNLOAD ENDPOINT WITH MULTI-STAGE RETRY
app.get("/api/download", limiter, async (req, res) => {
  let { url, videoId, id, title } = req.query;

  // Normalize: prioritize 'url' parameter
  let input = (url || videoId || id || "").toString().trim();

  if (!input) {
    return res.status(400).json({ error: "YouTube URL or Video ID required (parameter 'url')." });
  }

  // If it's just an ID, normalize to a full URL
  let targetUrl = input;
  if (!targetUrl.startsWith("http")) {
    targetUrl = `https://www.youtube.com/watch?v=${targetUrl}`;
  }

  const vId = extractVideoId(targetUrl);
  if (!vId) {
    return res.status(400).json({ error: "Invalid YouTube Video ID or URL." });
  }

  const displayTitle = (title || vId || "audio").toString();
  const safeFilename = sanitizeFilename(displayTitle);
  const encodedFilename = encodeURIComponent(safeFilename);

  console.log(`[Job] Request: ID=${vId} | URL=${targetUrl}`);

  // STAGE 1: Attempt 'bestaudio'
  async function startStage(formatSpec) {
    return new Promise((resolve) => {
      const ytArgs = [
        "-f", formatSpec,
        "--no-check-certificate",
        "--no-cache-dir",
        "--no-playlist",
        "--force-ipv4",
        "--extractor-args", "youtube:player_client=android,ios",
        "-o", "-",
        targetUrl
      ];

      const ffArgs = [
        "-i", "pipe:0",
        "-f", "mp3",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",
        "pipe:1"
      ];

      let ytProcess = spawn(YTDLP_PATH, ytArgs);
      let ffProcess = spawn(FFMPEG_PATH, ffArgs);
      let headersSent = false;
      let ytError = "";

      const killProcesses = () => {
        if (ytProcess) { try { ytProcess.kill("SIGKILL"); } catch (e) { } }
        if (ffProcess) { try { ffProcess.kill("SIGKILL"); } catch (e) { } }
      };

      ytProcess.stdout.pipe(ffProcess.stdin);

      ffProcess.stdout.once("data", (chunk) => {
        headersSent = true;
        console.log(`[Job] Data detected (${formatSpec}) for ${vId}. Streaming...`);
        res.writeHead(200, {
          "Content-Disposition": "attachment",
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-cache"
        });
        res.write(chunk);
      });

      ffProcess.stdout.on("data", (chunk) => {
        if (headersSent) res.write(chunk);
      });

      ytProcess.stderr.on("data", (data) => { ytError += data.toString(); });

      ytProcess.on("close", (code) => {
        if (code !== 0 && code !== null && !headersSent) {
          console.error(`[yt-dlp] Stage (${formatSpec}) failed. Code ${code}`);
          killProcesses();
          resolve({ success: false, error: ytError });
        }
      });

      ffProcess.on("close", (code) => {
        killProcesses();
        if (headersSent) {
          if (!res.writableEnded) res.end();
          resolve({ success: true });
        } else {
          resolve({ success: false, error: "FFmpeg ended prematurely" });
        }
      });

      // Handle client disconnect
      req.on("close", () => {
        killProcesses();
        resolve({ success: true, message: "Client disconnected" });
      });

      // Local timeout for this stage
      setTimeout(() => {
        if (!headersSent) {
          killProcesses();
          resolve({ success: false, error: "60s Timeout reached during format extraction" });
        }
      }, 60000);
    });
  }

  try {
    // Attempt 1: bestaudio (Preferred)
    let result = await startStage("bestaudio/best");

    // Attempt 2: fallback to 'best' (video+audio mixed) if Stage 1 failed
    if (!result.success) {
      console.warn(`[Job] Stage 1 (bestaudio) failed, retrying with Stage 2 (best)...`);
      result = await startStage("best");
    }

    if (!result.success && !res.headersSent) {
      console.error(`[Job Final] Both format stages failed for ${vId}.`);
      res.status(500).json({
        error: "Could not retrieve audio format. YouTube might be blocking the request or the video has restrictions."
      });
    }

  } catch (err) {
    console.error("[Fatal] Download Error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Internal Server Error during download.",
        details: err.message 
      });
    }
  }
});

// --- 6. YOUTUBE API CACHING ---
let cachedVideos = [];
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Legacy video fetching API with Caching
app.get("/api/latest-videos", async (req, res) => {
  const API_KEY = process.env.YT_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";

  // 1. Check if we have a fresh cache 
  const now = Date.now();
  if (cachedVideos.length > 0 && (now - cacheTimestamp < CACHE_TTL)) {
    console.log("[Cache] Serving /api/latest-videos from memory");
    return res.json({ videos: cachedVideos });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "API Key Missing", videos: cachedVideos });
  }

  try {
    console.log("[YouTube Quota] Fetching new data from YouTube Data API...");
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=20&order=date&type=video&key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    // YouTube Data API error
    if (data.error) {
      console.error("[YouTube Quota Error]:", data.error.message);
      // Graceful degradation: If YouTube throws an error (like quota exceeded), serve the stale cache if we have one, otherwise throw.
      if (cachedVideos.length > 0) {
        console.log("[Cache] Serving stale cache due to YouTube API Error.");
        return res.json({ videos: cachedVideos, warning: "Quota exceeded, showing cached data." });
      }
      return res.status(500).json({ error: data.error.message, videos: [] });
    }

    const videos = (data.items || []).map(v => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumbnail: v.snippet.thumbnails?.high?.url || "",
      publishedAt: v.snippet.publishedAt,
    })).filter(v => v.videoId);

    // Update Cache
    if (videos.length > 0) {
      cachedVideos = videos;
      cacheTimestamp = Date.now();
      console.log("[Cache] Memory updated with fresh YouTube data.");
    }

    res.json({ videos });
  } catch (err) {
    console.error("[Fetch Error]:", err.message);
    if (cachedVideos.length > 0) {
      return res.json({ videos: cachedVideos, warning: "Network error, showing cached data." });
    }
    res.status(500).json({ error: "Fetch failed", videos: [] });
  }
});

app.get("/api/prepare", (req, res) => res.json({ status: "ready" }));
app.get("/api/status", (req, res) => res.json({ status: "ready" }));

app.use((req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send("Frontend assets missing.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 ROBUST YT-DLP ENGINE READY | PORT ${PORT} | ${new Date().toLocaleTimeString()}`);
});
