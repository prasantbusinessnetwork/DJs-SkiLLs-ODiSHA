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

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. CRASH PROTECTION ---
// Prevent the process from exiting on unhandled errors (CRITICAL for production stability)
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 UNHANDLED REJECTION at:", promise, "reason:", reason);
});

// --- 2. MIDDLEWARE ---
app.use(cors({ exposedHeaders: ["Content-Disposition"] }));

// Serve static files from 'dist' (Vite build) and 'public'
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Rate limiting: 20 requests per 5 minutes per IP
const downloadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again in 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- 3. CONFIGURATION & UTILS ---
const isWin = process.platform === "win32";
// yt-dlp is installed to /usr/local/bin/yt-dlp in Docker, which is in PATH
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";
const FFMPEG_PATH = isWin ? path.join(__dirname, "bin", "ffmpeg.exe") : "ffmpeg";

function extractVideoId(input) {
  if (!input) return null;
  if (input.length === 11) return input;
  const match = input.match(/(?:v=|\/|be\/|embed\/|watch\?v=)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
}

function sanitizeFilename(name) {
  return (name || "download")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50) || "download";
}

// --- 4. API ROUTES ---

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Latest Videos (Proxy to YouTube API)
app.get("/api/latest-videos", async (req, res) => {
  const API_KEY = process.env.YT_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";

  if (!API_KEY) {
    console.error("❌ YT_API_KEY is missing from environment variables!");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=20&order=date&type=video&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const videos = (data.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      tag: "Latest",
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
    })).filter(v => v.videoId);

    res.json({ videos });
  } catch (err) {
    console.error("❌ Latest videos fetch failed:", err.message);
    res.status(500).json({ error: "Failed to load videos" });
  }
});

// Download Route (Robust Streaming)
app.get("/api/download", downloadLimiter, async (req, res) => {
  const { videoId, url, title } = req.query;
  const id = extractVideoId(videoId || url);

  if (!id) return res.status(400).json({ error: "Invalid Video ID or URL" });

  const streamAudio = (vidId, attempt = 1) => {
    return new Promise((resolve, reject) => {
      const fileName = sanitizeFilename(title || vidId);
      const encodedTitle = encodeURIComponent(title || vidId);

      // Set headers for download
      if (!res.headersSent) {
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}.mp3"; filename*=UTF-8''${encodedTitle}.mp3`);
        res.setHeader("Content-Type", "audio/mpeg");
      }

      console.log(`[Stream] Starting download for ${vidId} (Attempt ${attempt})`);

      const ytArgs = [
        "-f", "bestaudio",
        "--no-check-certificate",
        "--no-cache-dir",
        "--extractor-args", "youtube:player-client=android,web",
        "-o", "-",
        `https://www.youtube.com/watch?v=${vidId}`
      ];

      const ffArgs = [
        "-i", "pipe:0",
        "-f", "mp3",
        "-b:a", "192k",
        "pipe:1"
      ];

      const ytProc = spawn(YTDLP_PATH, ytArgs);
      const ffProc = spawn(FFMPEG_PATH, ffArgs);

      ytProc.stdout.pipe(ffProc.stdin);
      ffProc.stdout.pipe(res, { end: false });

      let stderr = "";
      ytProc.stderr.on("data", (d) => { stderr += d.toString(); });

      const cleanup = () => {
        try { ytProc.kill("SIGKILL"); } catch (e) { }
        try { ffProc.kill("SIGKILL"); } catch (e) { }
      };

      ytProc.on("close", (code) => {
        if (code !== 0 && code !== null) {
          cleanup();
          reject(new Error(`yt-dlp failed: ${stderr.slice(-100)}`));
        }
      });

      ffProc.on("close", (code) => {
        if (code === 0) {
          console.log(`[Stream] Successfully finished ${vidId}`);
          res.end();
          resolve();
        } else {
          cleanup();
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      req.on("close", () => {
        console.log(`[Stream] Client disconnected for ${vidId}`);
        cleanup();
        resolve();
      });
    });
  };

  try {
    await streamAudio(id, 1);
  } catch (err) {
    console.warn(`[Stream] Attempt 1 failed for ${id}:`, err.message);
    try {
      console.log(`[Stream] Retrying ${id} (Attempt 2)...`);
      await streamAudio(id, 2);
    } catch (retryErr) {
      console.error(`[Stream] Critical error for ${id}:`, retryErr.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download failed. Please try again later." });
      } else {
        res.end();
      }
    }
  }
});

// Compatibility endpoints
app.get("/api/prepare", (req, res) => res.json({ status: "ready" }));
app.get("/api/status", (req, res) => res.json({ status: "ready" }));

// --- 5. FALLBACK SPA ROUTING ---
app.get("*", (req, res) => {
  const distPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    console.error("❌ ERROR: 'dist/index.html' not found! Make sure to run 'npm run build'.");
    res.status(404).send("Frontend assets missing. Deployment might be incomplete.");
  }
});

// --- 6. START SERVER ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  🚀 SERVER IS LIVE AND CRASH-PROOFED
  ====================================
  Port:    ${PORT}
  Mode:    ${process.env.NODE_ENV || 'production'}
  Dist:    ${path.join(__dirname, "dist")}
  Time:    ${new Date().toLocaleString()}
  ====================================
  `);
});
