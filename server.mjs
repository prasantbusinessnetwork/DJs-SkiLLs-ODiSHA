import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: "*",
  exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"],
}));

// Paths and Config
const isWin = process.platform === "win32";
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";
const FFMPEG_PATH = isWin
  ? path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg.exe")
  : "ffmpeg";
const DOWNLOADS_DIR = path.join(__dirname, "downloads");
const CHANNEL_ID = "UC8FEwv0WXF5db-pIs8uJkag";
const CHANNEL_URL = `https://www.youtube.com/channel/${CHANNEL_ID}/videos`;

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// YouTube Data API - Support both Railway and Vercel env var names
const YOUTUBE_API_KEY = process.env.YT_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.CHANNEL_ID || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || CHANNEL_ID;

// Supabase (optional)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

let videoCache = { data: null, timestamp: 0, ttl: 10 * 60 * 1000 };
let fetching = false;

// Track jobs currently being prepared: videoId -> "preparing" | "ready" | "failed"
const prepareJobs = new Map();

function sanitizeFileName(raw) {
  return raw
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// ---- Background Channel Video Fetch ----
function fetchVideosBackground() {
  if (fetching) return;
  fetching = true;

  const ytDlp = spawn(YTDLP_PATH, [
    "--flat-playlist", "--playlist-items", "1-500",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "--no-check-certificate",
    "--print", "%(id)s|%(title)s|%(uploader)s|%(upload_date)s",
    CHANNEL_URL
  ]);

  let output = "";
  ytDlp.stdout.on("data", (data) => { output += data.toString(); });

  ytDlp.on("close", (code) => {
    fetching = false;
    if (code !== 0) return;

    const lines = output.trim().split("\n").filter(line => line.includes("|"));
    const videos = lines.map(line => {
      const [id, title, uploader, date] = line.split("|");
      const formattedDate = date && date.length === 8
        ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
        : new Date().toISOString();
      return {
        videoId: id, title, artist: uploader, tag: "Remix",
        youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        publishedAt: formattedDate
      };
    });

    videoCache = { data: videos, timestamp: Date.now(), ttl: 10 * 60 * 1000 };
    console.log(`[Cache] Updated with ${videos.length} videos`);
  });
}

setInterval(fetchVideosBackground, 5 * 60 * 1000);
fetchVideosBackground();

// ---- API: Video list ----
app.get("/api/videos", (req, res) => {
  const max = parseInt(req.query.maxResults) || 500;
  if (videoCache.data?.length > 0) return res.json(videoCache.data.slice(0, max));
  res.status(503).json({ error: "Cache warming up, try again in a moment" });
});

app.get("/api/latest-videos", (req, res) => {
  const max = parseInt(req.query.maxResults) || 500;
  if (videoCache.data?.length > 0) return res.json({ videos: videoCache.data.slice(0, max), cached: true });
  res.status(503).json({ error: "Cache warming up, try again in a moment" });
});

// ---- PHASE 1: Prepare MP3 in background ----
app.get("/api/prepare", (req, res) => {
  const { videoId, title } = req.query;
  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "videoId is required" });
  }

  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);

  // Already cached
  if (fs.existsSync(filePath)) {
    return res.json({ status: "ready", videoId });
  }

  // Already being prepared
  if (prepareJobs.get(videoId) === "preparing") {
    return res.json({ status: "preparing", videoId });
  }

  // Start background conversion
  prepareJobs.set(videoId, "preparing");
  console.log(`[Prepare] Starting MP3 conversion for ${videoId}`);

  const safeTitle = typeof title === "string" && title.trim()
    ? sanitizeFileName(title)
    : videoId;

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ytDlp = spawn(YTDLP_PATH, [
    "-x", "--audio-format", "mp3", "--audio-quality", "192K",
    "--ffmpeg-location", FFMPEG_PATH,
    "--no-check-certificate", "--no-cache-dir", "--no-part",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "-o", filePath,
    videoUrl
  ]);

  ytDlp.on("close", (code) => {
    if (code === 0 && fs.existsSync(filePath)) {
      prepareJobs.set(videoId, "ready");
      console.log(`[Prepare] Ready: ${videoId} (${safeTitle})`);
      // Log to Supabase
      if (supabase) {
        supabase.from("downloads").insert({
          video_id: videoId, title: safeTitle,
          downloaded_at: new Date().toISOString(),
        }).catch(() => {});
      }
    } else {
      prepareJobs.set(videoId, "failed");
      console.error(`[Prepare] Failed for ${videoId}, exit code ${code}`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });

  res.json({ status: "preparing", videoId });
});

// ---- PHASE 2: Poll status ----
app.get("/api/status", (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId is required" });

  const job = prepareJobs.get(videoId);
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);

  // If the file exists but we haven't tracked it, consider it 'ready' only if it has content
  if (!job && fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    if (stats.size > 1000) { // arbitrary size check to ensure it's not a dummy file
      prepareJobs.set(videoId, "ready");
      return res.json({ status: "ready", videoId });
    }
  }

  if (job === "ready") {
    return res.json({ status: "ready", videoId });
  }
  if (job === "failed") {
    return res.json({ status: "failed", videoId });
  }
  if (job === "preparing") {
    return res.json({ status: "preparing", videoId });
  }

  res.json({ status: "not_started", videoId });
});

// ---- PHASE 3: Serve cached file (instant, no timeout) ----
app.get("/api/download", (req, res) => {
  const { videoId, title } = req.query;
  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "videoId is required" });
  }

  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
  const safeTitle = typeof title === "string" && title.trim()
    ? sanitizeFileName(title)
    : videoId;

  const job = prepareJobs.get(videoId);

  // ONLY serve if we know it's ready. If it's still preparing, tell the client.
  if (job === "ready" && fs.existsSync(filePath)) {
    console.log(`[Download] Serving cached file for ${videoId}`);
    return res.download(filePath, `${safeTitle}.mp3`);
  }

  // File not ready or job failed — start preparing and tell client to poll
  res.status(202).json({ status: "preparing", message: "File is being prepared. Please poll /api/status." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
