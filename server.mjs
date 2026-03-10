import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YT_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET || "songs";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

const app = express();
app.use(cors({ origin: "*", exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"] }));
app.use(express.json());

const DOWNLOADS_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// isWin check for local dev
const isWin = process.platform === "win32";
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";

// On Windows, we need the directory containing both ffmpeg.exe and ffprobe.exe
const FFMPEG_BIN_ROOT = isWin ? path.join(__dirname, "bin") : "/usr/bin";
const FFMPEG_PATH = isWin ? path.join(FFMPEG_BIN_ROOT, "ffmpeg.exe") : ffmpegStatic;

// Startup check for Windows
if (isWin) {
  if (!fs.existsSync(FFMPEG_BIN_ROOT)) fs.mkdirSync(FFMPEG_BIN_ROOT, { recursive: true });
  const ffmpegExists = fs.existsSync(path.join(FFMPEG_BIN_ROOT, "ffmpeg.exe"));
  const ffprobeExists = fs.existsSync(path.join(FFMPEG_BIN_ROOT, "ffprobe.exe"));
  if (!ffmpegExists || !ffprobeExists) {
    console.warn("⚠️ [Startup] ffmpeg.exe or ffprobe.exe missing in /bin folder. Please ensure they are copied there for local conversion.");
  }
}

// Track jobs: videoId -> { status, title, supabaseUrl }
const jobs = new Map();

function sanitize(name) {
  return (name || "download").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, " ").trim().slice(0, 100) || "download";
}

async function uploadToSupabase(videoId, filePath, safeTitle) {
  if (!supabase) return null;
  try {
    const buffer = fs.readFileSync(filePath);
    const key = `${videoId}.mp3`;
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(key, buffer, { contentType: "audio/mpeg", upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(key);
    return publicUrl;
  } catch (err) { return null; }
}

async function startConversion(videoId, clientTitle) {
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
  const safeTitle = sanitize(clientTitle || videoId);

  if (jobs.get(videoId)?.status === "preparing") return;

  console.log(`[Job] Starting: ${videoId} (${safeTitle})`);
  jobs.set(videoId, { status: "preparing", title: safeTitle });

  const args = [
    "-x", "--audio-format", "mp3", "--audio-quality", "192K",
    "--ffmpeg-location", FFMPEG_BIN_ROOT,
    "--no-check-certificate", "--no-cache-dir", "--no-part", "--no-playlist",
    "--extractor-args", "youtube:player-client=android,ios",
    "--force-ipv4",
    "--add-header", "Accept-Language: en-US,en;q=0.9",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "-o", filePath,
    `https://www.youtube.com/watch?v=${videoId}`
  ];

  const ytDlpProc = spawn(YTDLP_PATH, args);

  let output = "";
  ytDlpProc.stdout.on("data", (data) => {
    const str = data.toString();
    if (str.includes("%")) {
      const match = str.match(/(\d+\.\d+)%/);
      if (match) process.stdout.write(`\r[Progress] ${videoId}: ${match[1]}% `);
    }
  });

  let stderr = "";
  ytDlpProc.stderr.on("data", (data) => stderr += data.toString());

  ytDlpProc.on("close", async (code) => {
    process.stdout.write("\n");
    if (code === 0 && fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
      console.log(`[Job] Success: ${videoId}`);
      const supabaseUrl = await uploadToSupabase(videoId, filePath, safeTitle);
      jobs.set(videoId, { status: "ready", title: safeTitle, supabaseUrl });
    } else {
      console.error(`[Job] Failed: ${videoId} (Exit Code: ${code})\n${stderr}`);
      try {
        fs.appendFileSync(path.join(__dirname, "last_error.log"), `[${new Date().toISOString()}] Failed: ${videoId} (Code: ${code})\n${stderr}\n`);
      } catch (e) {
        console.error("Failed to write log", e);
      }
      jobs.set(videoId, { status: "failed", title: safeTitle });
    }
  });
}

app.get("/api/prepare", (req, res) => {
  const { videoId, title } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId required" });

  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) return res.json({ status: "ready", videoId });

  startConversion(videoId, title);
  return res.json({ status: "preparing", videoId });
});

app.get("/api/status", (req, res) => {
  const { videoId } = req.query;
  const job = jobs.get(videoId);
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);

  if (!job && fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) return res.json({ status: "ready", videoId });
  return res.json(job || { status: "not_started", videoId });
});

app.get("/api/download", (req, res) => {
  const { videoId, title } = req.query;
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
  const fileName = sanitize(title || videoId) + ".mp3";

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "audio/mpeg");
    return res.download(filePath, fileName);
  }

  const job = jobs.get(videoId);
  if (job?.supabaseUrl) return res.redirect(job.supabaseUrl);

  return res.status(202).json({ status: "preparing", message: "Please poll /api/status" });
});

// Cache for YouTube video list to avoid burning API quota
let videoCache = { data: null, fetchedAt: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.get("/api/latest-videos", async (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 15;

  // Return from cache if still fresh
  if (videoCache.data && (Date.now() - videoCache.fetchedAt) < CACHE_TTL) {
    return res.json({ videos: videoCache.data.slice(0, maxResults) });
  }

  if (!YT_API_KEY) {
    return res.status(500).json({ error: "YT_API_KEY not set on server" });
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=50&order=date&type=video&key=${YT_API_KEY}`;
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
    const json = await response.json();

    const videos = (json.items || []).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      tag: "Latest",
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
      publishedAt: item.snippet.publishedAt,
    }));

    videoCache = { data: videos, fetchedAt: Date.now() };
    console.log(`[Cache] Updated with ${videos.length} videos`);
    res.json({ videos: videos.slice(0, maxResults) });
  } catch (err) {
    console.error("[YouTube API Error]:", err.message);
    // Return stale cache if available
    if (videoCache.data) return res.json({ videos: videoCache.data.slice(0, maxResults) });
    res.status(500).json({ error: "Failed to fetch videos from YouTube" });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok", jobs: jobs.size }));
app.get("/api/debug-jobs", (req, res) => {
  res.json({ jobs: Array.from(jobs.entries()) });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend live on port ${PORT}`);
});
