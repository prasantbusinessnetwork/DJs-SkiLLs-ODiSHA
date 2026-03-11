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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. MIDDLEWARE & SECURITY ---
app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Rate limiting to prevent YouTube blocks (10 downloads per 5 mins per IP)
const downloadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: "Too many downloads from this IP, please try again in 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- 2. ENVIRONMENT CHECK ---
const YT_API_KEY = process.env.YT_API_KEY;
if (!YT_API_KEY) {
  console.warn("⚠️ Warning: YT_API_KEY is missing. Channel fetch endpoints will fail.");
}

// --- 3. UTILITIES ---
const isWin = process.platform === "win32";
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";
const FFMPEG_CMD = isWin ? path.join(__dirname, "bin", "ffmpeg.exe") : "ffmpeg";

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

// --- 4. ENDPOINTS ---

// Fetch latest videos from channel
app.get("/api/latest-videos", async (req, res) => {
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  const maxResults = parseInt(req.query.maxResults) || 15;

  if (!YT_API_KEY) return res.status(500).json({ error: "YT_API_KEY not configured" });

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=50&order=date&type=video&key=${YT_API_KEY}`;
    const response = await fetch(searchUrl);
    const json = await response.json();

    if (json.error) throw new Error(json.error.message);

    const videos = (json.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      tag: "Latest",
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
    })).filter(v => v.videoId);

    res.json({ videos: videos.slice(0, maxResults) });
  } catch (err) {
    console.error("[Backend] Latest videos error:", err.message);
    res.status(500).json({ error: "Failed to fetch channel videos" });
  }
});

// MAIN RELIABLE DOWNLOAD ENDPOINT
app.get("/api/download", downloadLimiter, async (req, res) => {
  const { videoId, url, title } = req.query;
  const targetId = extractVideoId(videoId || url);

  if (!targetId) {
    return res.status(400).json({ error: "Invalid YouTube Video ID or URL" });
  }

  console.log(`[Download] Incoming request for ID: ${targetId} (Title: ${title || "Unknown"})`);

  const downloadStream = (id, attempt = 1) => {
    return new Promise((resolve, reject) => {
      const displayTitle = title || id || "download";
      const safeFilename = sanitizeFilename(displayTitle);
      const encodedTitle = encodeURIComponent(displayTitle);

      // Only set headers on first attempt to avoid protocol errors on retry
      if (attempt === 1) {
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp3"; filename*=UTF-8''${encodedTitle}.mp3`);
        res.setHeader("Content-Type", "audio/mpeg");
      }

      console.log(`[Stream] Attempt ${attempt} started for ${id}...`);

      const ytArgs = [
        "-f", "bestaudio",
        "--no-warnings",
        "--no-check-certificate",
        "--no-cache-dir",
        "--extractor-args", "youtube:player-client=android,web",
        "--force-ipv4",
        "-o", "-",
        `https://www.youtube.com/watch?v=${id}`
      ];

      const ffArgs = [
        "-i", "pipe:0",
        "-f", "mp3",
        "-b:a", "192k",
        "pipe:1"
      ];

      const ytDlpProc = spawn(YTDLP_PATH, ytArgs);
      const ffmpegProc = spawn(FFMPEG_CMD, ffArgs);

      ytDlpProc.stdout.pipe(ffmpegProc.stdin);
      // pipe with { end: false } so we can retry on the same 'res' if needed
      ffmpegProc.stdout.pipe(res, { end: false });

      let ytStderr = "";
      ytDlpProc.stderr.on("data", (data) => { ytStderr += data.toString(); });

      const killProcs = () => {
        try { ytDlpProc.kill("SIGKILL"); } catch (e) { }
        try { ffmpegProc.kill("SIGKILL"); } catch (e) { }
      };

      ytDlpProc.on("error", (err) => {
        killProcs();
        reject(new Error(`yt-dlp Startup Error: ${err.message}`));
      });

      ffmpegProc.on("error", (err) => {
        killProcs();
        reject(new Error(`FFmpeg Startup Error: ${err.message}`));
      });

      ytDlpProc.on("close", (code) => {
        if (code !== 0 && code !== null) {
          killProcs();
          reject(new Error(`yt-dlp exited with code ${code}: ${ytStderr.slice(-200)}`));
        }
      });

      ffmpegProc.on("close", (code) => {
        if (code === 0) {
          console.log(`[Stream] Success: Finished streaming ${id}`);
          res.end(); // Manually end because of { end: false }
          resolve();
        } else {
          killProcs();
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      // Cleanup if user cancels download
      req.on("close", () => {
        console.log(`[Stream] Connection closed by client for ${id}`);
        killProcs();
        resolve();
      });
    });
  };

  try {
    await downloadStream(targetId, 1);
  } catch (err) {
    console.warn(`[Stream Error] Attempt 1 failed for ${targetId}:`, err.message);

    // Auto-retry once
    try {
      console.log(`[Stream] Retrying ${targetId} (Attempt 2)...`);
      await downloadStream(targetId, 2);
    } catch (retryErr) {
      console.error(`[Stream Error] Final failure for ${targetId}:`, retryErr.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download failed after retry. YouTube might be temporarily blocking requests." });
      } else {
        res.end();
      }
    }
  }
});

// Mock Status endpoints for frontend compatibility
app.get("/api/prepare", (req, res) => res.json({ status: "ready" }));
app.get("/api/status", (req, res) => res.json({ status: "ready" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// --- 5. FRONTEND ROUTING ---
app.get("*", (req, res) => {
  const distPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(distPath)) {
    res.sendFile(distPath);
  } else {
    res.status(404).send("Frontend build not found. Run 'npm run build' first.");
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ==================================================
  🚀 PRODUCTION DOWNLOADER READY
  ==================================================
  Port:    ${PORT}
  OS:      ${process.platform}
  YTDLP:   ${YTDLP_PATH}
  FFMPEG:  ${FFMPEG_CMD}
  ==================================================
  `);
});
