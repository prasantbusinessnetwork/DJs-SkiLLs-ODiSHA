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
    status: "ok",
    platform: process.platform,
    env: process.env.NODE_ENV || "development"
  });
});

// MAIN RELIABLE STREAMING DOWNLOAD ENDPOINT
app.get("/api/download", limiter, async (req, res) => {
  let { url, videoId, id, title } = req.query;

  // Normalize: prioritize 'url' parameter as requested by user
  let input = url || videoId || id;

  if (!input) {
    return res.status(400).json({ error: "YouTube URL or Video ID required (parameter 'url')." });
  }

  // If it's just an ID, normalize to a full URL for the extractor
  let targetUrl = input;
  if (!targetUrl.startsWith("http")) {
    targetUrl = `https://www.youtube.com/watch?v=${targetUrl}`;
  }

  const vId = extractVideoId(targetUrl);
  if (!vId) {
    return res.status(400).json({ error: "Invalid YouTube Video ID or URL." });
  }

  const displayTitle = title || vId || "audio";
  const safeFilename = sanitizeFilename(displayTitle);
  const encodedFilename = encodeURIComponent(safeFilename);

  console.log(`[Job] Request: ID=${vId} | Title=${displayTitle}`);

  const ytArgs = [
    "-f", "ba/best",
    "--no-check-certificate",
    "--no-cache-dir",
    "--no-playlist",
    "--extractor-args", "youtube:player-client=android,ios,web",
    "--force-ipv4",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "-o", "-",
    `https://www.youtube.com/watch?v=${vId}`
  ];

  const ffArgs = [
    "-i", "pipe:0",
    "-f", "mp3",
    "-b:a", "192k",
    "-ar", "44100",
    "-ac", "2",
    "pipe:1"
  ];

  let ytProcess;
  let ffProcess;
  let headersSent = false;
  let ytError = "";

  const killProcesses = () => {
    if (ytProcess) { try { ytProcess.kill("SIGKILL"); } catch (e) { } }
    if (ffProcess) { try { ffProcess.kill("SIGKILL"); } catch (e) { } }
  };

  try {
    ytProcess = spawn(YTDLP_PATH, ytArgs);
    ffProcess = spawn(FFMPEG_PATH, ffArgs);

    ytProcess.stdout.pipe(ffProcess.stdin);

    // BUFFER first chunk to ensure we actually have data before sending 200 OK
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

    ytProcess.stderr.on("data", (data) => { ytError += data.toString(); });

    ytProcess.on("close", (code) => {
      if (code !== 0 && code !== null && !headersSent) {
        console.error(`[yt-dlp] Error ${code}: ${ytError.slice(-200)}`);
        if (!res.headersSent) {
          const isBot = ytError.includes("confirm you are a human") || ytError.includes("PO-Token");
          res.status(500).json({
            error: isBot ? "YouTube is blocking the request. Please try again later." : "Could not retrieve audio format."
          });
        }
        killProcesses();
      }
    });

    ffProcess.on("close", (code) => {
      console.log(`[ffmpeg] Finished with code ${code}`);
      killProcesses();
      if (!res.writableEnded) res.end();
    });

    req.on("close", () => {
      console.log(`[Job] Client disconnected: ${vId}`);
      killProcesses();
    });

    // Timeout if no data after 20 seconds
    setTimeout(() => {
      if (!headersSent && !res.writableEnded) {
        console.warn(`[Job] Timeout: No data for ${vId}`);
        killProcesses();
        if (!res.headersSent) res.status(504).json({ error: "YouTube took too long to respond. Try again." });
      }
    }, 25000);

  } catch (err) {
    console.error("[Fatal] Stream Error:", err.message);
    killProcesses();
    if (!res.headersSent) res.status(500).json({ error: "Internal Streaming Error" });
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
  console.log(`🚀 ENGINE READY | PORT ${PORT} | ${new Date().toLocaleTimeString()}`);
});
