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
  origin: ["http://localhost:8080", "https://djs-skills-odisha.vercel.app", "*"],
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

// YouTube Data API - Prioritize Railway-style naming
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

let videoCache = {
  data: null,
  timestamp: 0,
  ttl: 10 * 60 * 1000
};

let fetching = false;
let downloadingQueue = new Set();

function sanitizeFileName(raw) {
  return raw
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function downloadInBackground(videoId, title) {
  if (downloadingQueue.has(videoId)) return;
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
  if (fs.existsSync(filePath)) return;

  console.log(`[Auto-Download] Starting background download for: ${title} (${videoId})`);
  downloadingQueue.add(videoId);

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const ytDlp = spawn(YTDLP_PATH, [
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "192K",
    "--ffmpeg-location", FFMPEG_PATH,
    "--no-check-certificate",
    "--no-cache-dir",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "-o", filePath,
    videoUrl
  ]);

  ytDlp.on("close", (code) => {
    downloadingQueue.delete(videoId);
    if (code === 0) console.log(`[Auto-Download] Successfully archived: ${title}`);
    else console.error(`[Auto-Download] Failed to download ${videoId}, exit code ${code}`);
  });
}

function fetchVideosBackground() {
  if (fetching) return;
  fetching = true;
  console.log("Fetching fresh videos from YouTube in background...");
  
  const ytDlp = spawn(YTDLP_PATH, [
    "--flat-playlist",
    "--playlist-items", "1-500", 
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
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
      // Format 20240101 into 2024-01-01
      const formattedDate = date && date.length === 8 
        ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
        : new Date().toISOString();

      return {
        videoId: id,
        title: title,
        artist: uploader,
        tag: "Remix",
        youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        publishedAt: formattedDate
      };
    });

    videoCache = { data: videos, timestamp: Date.now(), ttl: 10 * 60 * 1000 };
    console.log("Background cache updated successfully");
    videos.slice(0, 8).forEach(v => downloadInBackground(v.videoId, v.title));
  });
}

setInterval(fetchVideosBackground, 5 * 60 * 1000);
fetchVideosBackground();

app.get("/api/videos", async (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 500;
  if (videoCache.data && videoCache.data.length > 0) return res.json(videoCache.data.slice(0, maxResults));
  return res.status(503).json({ error: "Cache warming up" });
});

// Alias for compatibility with remote latest-videos endpoint
app.get("/api/latest-videos", async (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 500;
  if (videoCache.data && videoCache.data.length > 0) return res.json({ videos: videoCache.data.slice(0, maxResults), cached: true });
  return res.status(503).json({ error: "Cache warming up" });
});

function getVideoTitle(videoUrl) {
  return new Promise((resolve) => {
    const proc = spawn(YTDLP_PATH, [
      "--get-title",
      "--no-warnings",
      "--no-check-certificate",
      "--no-cache-dir",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      videoUrl
    ]);
    let out = "";
    proc.stdout.on("data", (d) => { out += d.toString(); });
    proc.on("close", () => {
      const raw = out.trim();
      const safe = sanitizeFileName(raw);
      resolve(safe || null);
    });
    proc.on("error", () => resolve(null));
    setTimeout(() => { proc.kill(); resolve(null); }, 10000);
  });
}

app.get("/api/download", async (req, res) => {
  try {
    const { videoId, title } = req.query;
    if (!videoId || typeof videoId !== "string") return res.status(400).json({ error: "videoId query param is required" });

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let safeTitle;
    if (typeof title === "string" && title.trim()) {
      safeTitle = sanitizeFileName(title);
    } else {
      const fetchedTitle = await getVideoTitle(videoUrl);
      safeTitle = fetchedTitle || videoId;
    }

    const encodedFilename = encodeURIComponent(`${safeTitle}.mp3`).replace(/'/g, "%27");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    if (supabase) {
      supabase.from("downloads").insert({
        video_id: videoId,
        title: safeTitle,
        downloaded_at: new Date().toISOString(),
      }).then(r => r.error && console.error("Supabase log error:", r.error.message))
      .catch(e => console.error("Supabase log exception:", e.message));
    }

    const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
    if (fs.existsSync(filePath)) {
      console.log(`[Download] Serving cached file for ${videoId}`);
      return res.sendFile(filePath);
    }

    console.log(`[Download] Streaming and caching ${videoId}`);
    const ytDlp = spawn(YTDLP_PATH, [
      "-x", "--audio-format", "mp3", "--audio-quality", "192K", "--ffmpeg-location", FFMPEG_PATH,
      "--no-check-certificate", "--no-cache-dir",
      "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "-o", "-", videoUrl
    ]);

    ytDlp.stdout.pipe(res);
    const fileStream = fs.createWriteStream(filePath);
    ytDlp.stdout.pipe(fileStream);

    ytDlp.on("close", (code) => {
      if (code !== 0) {
        if (!res.headersSent) res.status(500).json({ error: "Failed to download audio" });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (!res.writableEnded) res.end();
    });

    req.on("close", () => { ytDlp.kill(); });
  } catch (err) {
    console.error("Download error:", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Download server running on port ${PORT} (0.0.0.0)`);
});
