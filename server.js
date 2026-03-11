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

// --- 1. PREVENT CRASHES (Global Error Handlers) ---
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("🔥 UNHANDLED REJECTION:", reason);
});

// --- 2. MIDDLEWARE ---
// Explicitly enable CORS for Vercel/External access
app.use(cors({ origin: "*", exposedHeaders: ["Content-Disposition"] }));
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Global Rate Limiter to protect from YouTube IP block
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50, // 50 requests per 5 minutes
  message: { error: "Too many requests. Please wait a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- 3. BINARY DETECTION ---
const isWin = process.platform === "win32";
// yt-dlp is installed globally in the Docker /usr/local/bin
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";
const FFMPEG_PATH = isWin ? path.join(__dirname, "bin", "ffmpeg.exe") : "ffmpeg";

// --- 4. UTILS ---
function extractVideoId(input) {
  if (!input) return null;
  if (input.length === 11) return input;
  const match = input.match(/(?:v=|\/|be\/|embed\/|watch\?v=)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
}

function sanitize(name) {
  return (name || "audio")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50) || "download";
}

// --- 5. ENDPOINTS ---

// Health Check for Railway/External Monitoring
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), time: new Date().toISOString() });
});

// MAIN RELIABLE STREAMING DOWNLOAD ENDPOINT
app.get("/api/download", limiter, async (req, res) => {
  const { videoId, url, title } = req.query;
  const idToStream = extractVideoId(videoId || url);

  if (!idToStream) {
    return res.status(400).json({ error: "Invalid YouTube Video ID or URL" });
  }

  const startStreaming = (vId, attempt = 1) => {
    return new Promise((resolve, reject) => {
      const displayTitle = title || vId || "audio";
      const safeFilename = sanitize(displayTitle);
      const encodedFilename = encodeURIComponent(displayTitle);

      // Only set headers on first attempt to avoid stream corruption on retry
      if (!res.headersSent) {
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp3"; filename*=UTF-8''${encodedFilename}.mp3`);
        res.setHeader("Content-Type", "audio/mpeg");
      }

      console.log(`[Job] Starting Stream: ID=${vId} | Attempt=${attempt}`);

      // yt-dlp Arguments (Optimized for performance and stability)
      const ytArgs = [
        "-f", "bestaudio",
        "--no-check-certificate",
        "--no-cache-dir",
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
        "pipe:1"
      ];

      const ytProcess = spawn(YTDLP_PATH, ytArgs);
      const ffProcess = spawn(FFMPEG_PATH, ffArgs);

      ytProcess.stdout.pipe(ffProcess.stdin);
      // Pipe through result with end: false for retry capability
      ffProcess.stdout.pipe(res, { end: false });

      let stderrLog = "";
      ytProcess.stderr.on("data", (d) => { stderrLog += d.toString(); });

      const killAll = () => {
        try { ytProcess.kill("SIGKILL"); } catch (e) { }
        try { ffProcess.kill("SIGKILL"); } catch (e) { }
      };

      ytProcess.on("close", (code) => {
        if (code !== 0 && code !== null) {
          killAll();
          reject(new Error(`yt-dlp failed (code ${code}): ${stderrLog.slice(-100)}`));
        }
      });

      ffProcess.on("close", (code) => {
        if (code === 0) {
          console.log(`[Job] Success: Finished streaming ${vId}`);
          res.end();
          resolve();
        } else {
          killAll();
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      req.on("close", () => {
        console.log(`[Job] Canceled: Connection closed for ${vId}`);
        killAll();
        resolve();
      });
    });
  };

  try {
    await startStreaming(idToStream, 1);
  } catch (err) {
    console.warn(`[Warn] Attempt 1 failed for ${idToStream}:`, err.message);
    try {
      console.log(`[Stream] Retrying ${idToStream} (Attempt 2)...`);
      await startStreaming(idToStream, 2);
    } catch (retryErr) {
      console.error(`[Fatal] Critical fail for ${idToStream}:`, retryErr.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download failed after multiple attempts." });
      } else {
        res.end();
      }
    }
  }
});

// Latest Videos Mock (To ensure Frontend works even if API key is missing)
app.get("/api/latest-videos", async (req, res) => {
  const API_KEY = process.env.YT_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  if (!API_KEY) return res.status(500).json({ error: "API Key Missing" });

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=15&order=date&type=video&key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const videos = (data.items || []).map(v => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumbnail: v.snippet.thumbnails?.medium?.url || "",
    })).filter(v => v.videoId);
    res.json({ videos });
  } catch {
    res.status(500).json({ error: "Channel fetch failed" });
  }
});

// Mock Status endpoints for frontend support
app.get("/api/prepare", (req, res) => res.json({ status: "ready" }));
app.get("/api/status", (req, res) => res.json({ status: "ready" }));

// --- 6. SPA ROUTING ---
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend build missing. Run 'npm run build' or check your Docker setup.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  🚀 SYSTEM REBUILT: PRODUCTION ENGINE READY
  ===========================================
  Port:    ${PORT} (Railway Compatible)
  Path:    ${__dirname}
  Time:    ${new Date().toLocaleString()}
  ===========================================
  `);
});
