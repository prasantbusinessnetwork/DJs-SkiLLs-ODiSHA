import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";
import rateLimit from "express-rate-limit";
import play from "play-dl"; // Replaced ytdl-core for bot bypass

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
  methods: ["GET", "POST", "OPTIONS"],
  exposedHeaders: ["Content-Disposition", "Content-Length", "X-Suggested-Filename"],
  credentials: true
}));

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- 3. BINARY DETECTION ---
const isWin = process.platform === "win32";
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
    status: "ok",
    platform: process.platform,
    env: process.env.NODE_ENV || "development"
  });
});

// MAIN RELIABLE STREAMING DOWNLOAD ENDPOINT (play-dl version)
app.get("/api/download", limiter, async (req, res) => {
  let { url, videoId, id, title } = req.query;
  let input = url || videoId || id;

  if (!input) {
    return res.status(400).json({ error: "YouTube URL or Video ID required (parameter 'url')." });
  }

  let targetUrl = input;
  if (!targetUrl.startsWith("http")) {
    targetUrl = `https://www.youtube.com/watch?v=${targetUrl}`;
  }

  const vId = extractVideoId(targetUrl);
  if (!vId) {
    return res.status(400).json({ error: "Invalid YouTube Video ID or URL." });
  }

  console.log(`[Job] Request: ID=${vId} | URL=${targetUrl}`);

  try {
    // 1. Get info using play-dl (More robust against bot blocks)
    console.log(`[play-dl] Fetching info for ${targetUrl}...`);
    const info = await play.video_info(targetUrl);

    const displayTitle = title || info.video_details.title || vId || "audio";
    const safeFilename = sanitizeFilename(displayTitle);
    const encodedFilename = encodeURIComponent(safeFilename);

    console.log(`[play-dl] Getting stream for: ${displayTitle}`);

    // 2. Stream audio
    const stream = await play.stream_from_info(info, {
      discordPlayerCompatibility: true,
      quality: 2 // highest audio usually
    });

    // FFmpeg pipe for reliable MP3 conversion
    const ffArgs = [
      "-i", "pipe:0",
      "-f", "mp3",
      "-b:a", "192k",
      "-ar", "44100",
      "-ac", "2",
      "pipe:1"
    ];

    let ffProcess;
    let headersSent = false;

    const killFFmpeg = () => {
      if (ffProcess) { try { ffProcess.kill("SIGKILL"); } catch (e) { } }
    };

    ffProcess = spawn(FFMPEG_PATH, ffArgs);

    // Pipe play-dl stream to FFmpeg
    stream.stream.pipe(ffProcess.stdin);

    // Buffer chunk gating (Ensures we don't send 200 OK for empty streams)
    ffProcess.stdout.once("data", (chunk) => {
      headersSent = true;
      res.writeHead(200, {
        "Content-Disposition": `attachment; filename="${safeFilename}.mp3"; filename*=UTF-8''${encodedFilename}.mp3`,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });
      res.write(chunk);
    });

    ffProcess.stdout.on("data", (chunk) => {
      if (headersSent) res.write(chunk);
    });

    ffProcess.on("close", (code) => {
      console.log(`[ffmpeg] Finished with code ${code}`);
      if (!res.writableEnded) res.end();
    });

    stream.stream.on("error", (err) => {
      console.error("[stream error]:", err.message);
      if (!headersSent) res.status(500).json({ error: "YouTube stream interrupted." });
      killFFmpeg();
    });

    req.on("close", () => {
      console.log(`[Job] Client disconnected: ${vId}`);
      if (stream.stream && typeof stream.stream.destroy === 'function') stream.stream.destroy();
      killFFmpeg();
    });

    // Timeout if no data
    setTimeout(() => {
      if (!headersSent && !res.writableEnded) {
        console.warn(`[Job] Timeout: No data for ${vId}`);
        if (stream.stream && typeof stream.stream.destroy === 'function') stream.stream.destroy();
        killFFmpeg();
        if (!res.headersSent) res.status(504).json({ error: "Download timeout. Please try again." });
      }
    }, 30000);

  } catch (err) {
    console.error("[Fatal] Stream Error:", err.message);
    if (!res.headersSent) {
      if (err.message.includes("Sign in to confirm")) {
        res.status(403).json({ error: "YouTube is blocking the request (Bot detection). Try another video or retry later." });
      } else {
        res.status(500).json({ error: "Could not retrieve audio format or info." });
      }
    }
  }
});

app.get("/api/latest-videos", async (req, res) => {
  const API_KEY = process.env.YT_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  if (!API_KEY) return res.status(500).json({ error: "API Key Missing" });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=20&order=date&type=video&key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const videos = (data.items || []).map(v => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumbnail: v.snippet.thumbnails?.high?.url || "",
      publishedAt: v.snippet.publishedAt,
    })).filter(v => v.videoId);

    res.json({ videos });
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
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
  console.log(`🚀 ENGINE READY (play-dl) | PORT ${PORT} | ${new Date().toLocaleTimeString()}`);
});
