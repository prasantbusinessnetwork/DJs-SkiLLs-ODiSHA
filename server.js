import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Identify OS
const isWin = process.platform === "win32";
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";

// Helper to extract Video ID
function extractVideoId(input) {
  if (!input) return null;
  if (input.length === 11) return input;
  const match = input.match(/(?:v=|\/|be\/|embed\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
}

// 1. YouTube Video Fetcher (Keep for compatibility)
app.get("/api/latest-videos", async (req, res) => {
  const YT_API_KEY = process.env.YT_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  const maxResults = parseInt(req.query.maxResults) || 15;

  if (!YT_API_KEY) return res.status(500).json({ error: "YT_API_KEY not set" });

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=50&order=date&type=video&key=${YT_API_KEY}`;
    const response = await fetch(searchUrl);
    const json = await response.json();
    const videos = (json.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      tag: "Latest",
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || "",
    }));
    res.json({ videos: videos.slice(0, maxResults) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// 2. MAIN DOWNLOAD ENDPOINT
app.get("/api/download", async (req, res) => {
  const { videoId, url, title } = req.query;
  const targetId = extractVideoId(videoId || url);

  if (!targetId) return res.status(400).json({ error: "Invalid YouTube ID or URL" });

  const startStream = (id, attempt = 1) => {
    return new Promise((resolve, reject) => {
      const rawTitle = title || id || "download";
      const safeAscii = rawTitle.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 50) || "download";
      const encodedTitle = encodeURIComponent(rawTitle);

      if (attempt === 1) {
        res.setHeader("Content-Disposition", `attachment; filename="${safeAscii}.mp3"; filename*=UTF-8''${encodedTitle}.mp3`);
        res.setHeader("Content-Type", "audio/mpeg");
      }

      console.log(`[Stream] Attempt ${attempt} for: ${id}`);

      const FFMPEG_CMD = isWin ? path.join(__dirname, "bin", "ffmpeg.exe") : "ffmpeg";

      const ytArgs = [
        "-f", "bestaudio",
        "--no-warnings", "-q",
        "--no-check-certificate", "--no-cache-dir",
        "--extractor-args", "youtube:player-client=android,web",
        "-o", "-",
        `https://www.youtube.com/watch?v=${id}`
      ];

      const ffArgs = ["-i", "pipe:0", "-f", "mp3", "-b:a", "192k", "pipe:1"];

      const ytDlpProc = spawn(YTDLP_PATH, ytArgs);
      const ffmpegProc = spawn(FFMPEG_CMD, ffArgs);

      ytDlpProc.stdout.pipe(ffmpegProc.stdin);
      ffmpegProc.stdout.pipe(res, { end: false });

      const cleanup = () => {
        try { ytDlpProc.kill("SIGKILL"); } catch (e) { }
        try { ffmpegProc.kill("SIGKILL"); } catch (e) { }
      };

      ytDlpProc.on("error", (err) => { cleanup(); reject(err); });
      ffmpegProc.on("error", (err) => { cleanup(); reject(err); });

      ytDlpProc.on("close", (code) => {
        if (code !== 0 && code !== null) { cleanup(); reject(new Error(`yt-dlp error ${code}`)); }
      });

      ffmpegProc.on("close", (code) => {
        if (code === 0) {
          console.log(`[Stream] Success: ${id}`);
          res.end();
          resolve();
        } else {
          cleanup();
          reject(new Error(`FFmpeg error ${code}`));
        }
      });

      req.on("close", () => { cleanup(); resolve(); });
    });
  };

  try {
    await startStream(targetId, 1);
  } catch (err) {
    console.error(`Attempt 1 failed:`, err.message);
    try {
      console.log(`Retrying...`);
      await startStream(targetId, 2);
    } catch (retryErr) {
      if (!res.headersSent) res.status(500).json({ error: "Download failed after retries" });
      else res.end();
    }
  }
});

// Compatibility endpoints
app.get("/api/prepare", (req, res) => res.json({ status: "ready" }));
app.get("/api/status", (req, res) => res.json({ status: "ready" }));

// Serve Frontend SPA
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "dist", "index.html");
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send("Frontend build missing. Please run npm run build.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server ready on port ${PORT}`);
});
