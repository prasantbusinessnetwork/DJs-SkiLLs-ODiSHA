import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
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
const FFMPEG_PATH = isWin ? path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg.exe") : ffmpegStatic;

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

let lastJobInfo = { videoId: "", code: null, error: "" };

async function startConversion(videoId, clientTitle) {
  lastJobInfo = { videoId, code: null, error: "" };
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
  const safeTitle = sanitize(clientTitle || videoId);

  if (jobs.get(videoId)?.status === "preparing") return;
  jobs.set(videoId, { status: "preparing", title: safeTitle });

  const ytDlpProc = spawn(YTDLP_PATH, [
    "-x", "--audio-format", "mp3", "--audio-quality", "192K",
    "--ffmpeg-location", FFMPEG_PATH,
    "--no-check-certificate", "--no-cache-dir", "--no-part", "--no-playlist",
    "--extractor-args", "youtube:player-client=ios,tv",
    "--force-ipv4",
    "--add-header", "Accept-Language: en-US,en;q=0.9",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "-o", filePath,
    `https://www.youtube.com/watch?v=${videoId}`
  ]);

  let stderr = "";
  ytDlpProc.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  ytDlpProc.on("close", async (code) => {
    lastJobInfo.code = code;
    if (code === 0 && fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
      console.log(`[Job] Success: ${videoId}`);
      const supabaseUrl = await uploadToSupabase(videoId, filePath, safeTitle);
      jobs.set(videoId, { status: "ready", title: safeTitle, supabaseUrl });
    } else {
      console.error(`[Job] Failed: ${videoId} (Exit Code: ${code})`);
      if (stderr) {
        console.error(`[yt-dlp Error Output]:\n${stderr}`);
        lastJobInfo.error = stderr;
      }
      jobs.set(videoId, { status: "failed", title: safeTitle });
    }
  });
}

app.get("/api/debug-last-error", (req, res) => res.json(lastJobInfo));

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

app.get("/api/health", (req, res) => res.json({ status: "ok", jobs: jobs.size }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend live on port ${PORT}`);
});
