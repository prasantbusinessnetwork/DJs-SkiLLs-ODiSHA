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
// Permissive CORS for Vercel <-> Railway communication
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  exposedHeaders: ["Content-Disposition", "Content-Length", "X-Suggested-Filename"],
  credentials: true
}));

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Global Rate Limiter to protect Railway IP from being blocked by YouTube
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- 3. BINARY DETECTION ---
const isWin = process.platform === "win32";
// Railway (Linux) will use the system binaries installed in Dockerfile
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";
// Find ffmpeg: check local bin first (Windows), then system path
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

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    platform: process.platform,
    env: process.env.NODE_ENV || "development",
    time: new Date().toISOString()
  });
});

// MAIN RELIABLE STREAMING DOWNLOAD ENDPOINT
app.get("/api/download", limiter, async (req, res) => {
  const { videoId, url, title } = req.query;
  const vId = extractVideoId(videoId || url);

  if (!vId) {
    return res.status(400).json({ error: "Invalid YouTube Video ID or URL" });
  }

  const displayTitle = title || vId || "audio";
  const safeFilename = sanitizeFilename(displayTitle);
  const encodedFilename = encodeURIComponent(safeFilename);

  console.log(`[Job] Request: ID=${vId} | Title=${displayTitle}`);

  // Set Headers Immediately to prevent timeout
  res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp3"; filename*=UTF-8''${encodedFilename}.mp3`);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // yt-dlp Arguments (Optimized for performance and stability)
  const ytArgs = [
    "-f", "ba/b",
    "--no-check-certificate",
    "--no-cache-dir",
    "--no-playlist",
    "--extractor-args", "youtube:player-client=android,web",
    "--force-ipv4",
    "-o", "-",
    `https://www.youtube.com/watch?v=${vId}`
  ];

  // ffmpeg Arguments (Stream straight to Res)
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

  const killProcesses = () => {
    if (ytProcess) { try { ytProcess.kill("SIGKILL"); } catch (e) { } }
    if (ffProcess) { try { ffProcess.kill("SIGKILL"); } catch (e) { } }
  };

  try {
    ytProcess = spawn(YTDLP_PATH, ytArgs);
    ffProcess = spawn(FFMPEG_PATH, ffArgs);

    // Pipe yt-dlp output to ffmpeg
    ytProcess.stdout.pipe(ffProcess.stdin);

    // Pipe ffmpeg output to response (With error handling to ignore EPIPE)
    res.on("error", (err) => {
      if (err.code !== "EPIPE") console.error("[Response Error]", err.message);
    });

    ffProcess.stdout.on("error", (err) => {
      if (err.code !== "EPIPE") console.error("[FFmpeg Output Error]", err.message);
    });

    ffProcess.stdout.pipe(res);

    // Handle yt-dlp errors
    let ytError = "";
    ytProcess.stderr.on("data", (data) => {
      ytError += data.toString();
    });

    ytProcess.on("error", (err) => {
      console.error("[yt-dlp] Process Error:", err.message);
      killProcesses();
      if (!res.headersSent) res.status(500).json({ error: "Failed to start yt-dlp" });
    });

    ffProcess.on("error", (err) => {
      console.error("[ffmpeg] Process Error:", err.message);
      killProcesses();
    });

    ytProcess.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[yt-dlp] Failed with code ${code}: ${ytError.slice(-200)}`);
        killProcesses();
        // We can't send status 500 here because headers are likely already sent
        if (!res.writableEnded) res.end();
      }
    });

    ffProcess.on("close", (code) => {
      console.log(`[ffmpeg] Finished with code ${code}`);
      killProcesses();
      if (!res.writableEnded) res.end();
    });

    // If client disconnects, kill processes
    req.on("close", () => {
      console.log(`[Job] Client disconnected: ${vId}`);
      killProcesses();
    });

  } catch (err) {
    console.error("[Fatal] Stream Error:", err.message);
    killProcesses();
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error during streaming" });
    }
  }
});

// Channel Videos Endpoint
app.get("/api/latest-videos", async (req, res) => {
  const API_KEY = process.env.YT_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";

  if (!API_KEY) {
    console.warn("[API] Missing YT_API_KEY env var");
    return res.status(500).json({ error: "Server configuration error: YouTube API key missing." });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=20&order=date&type=video&key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.error) {
      console.error("[YouTube API Error]", data.error);
      return res.status(data.error.code || 500).json({ error: data.error.message });
    }

    const videos = (data.items || []).map(v => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || "",
      publishedAt: v.snippet.publishedAt,
    })).filter(v => v.videoId);

    res.json({ videos });
  } catch (err) {
    console.error("[API] Fetch failed:", err.message);
    res.status(500).json({ error: "Failed to fetch videos from YouTube." });
  }
});

// Backward compatibility mocks
app.get("/api/prepare", (req, res) => res.json({ status: "ready" }));
app.get("/api/status", (req, res) => res.json({ status: "ready" }));

// --- 6. SPA ROUTING ---
// Serve the built index.html for all unknown routes (for React Router)
app.use((req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If running in development or dist missing
    res.status(404).send("Frontend assets not found. If this is Railway, check your Docker build.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ===========================================
  🚀 AUDIO ENGINE: ONLINE
  Port:    ${PORT}
  System:  ${process.platform}
  Time:    ${new Date().toLocaleString()}
  ===========================================
  `);
});
