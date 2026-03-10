import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import ytdl from "@distube/ytdl-core";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────
// Config  (all values come from env variables)
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YT_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET || "songs";

// ─────────────────────────────────────────────
// Supabase client (optional — only used if configured)
// ─────────────────────────────────────────────
const supabase =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
    : null;

// ─────────────────────────────────────────────
// App & Directories
// ─────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*", exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"] }));
app.use(express.json());

const DOWNLOADS_DIR = path.join(__dirname, "downloads");
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// ─────────────────────────────────────────────
// In-memory job tracker
// ─────────────────────────────────────────────
// Map<videoId, { status: "preparing"|"ready"|"failed", title?: string, supabaseUrl?: string }>
const jobs = new Map();

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function sanitize(name) {
  return (name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "download";
}

async function fetchVideoTitle(videoId) {
  if (!YT_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YT_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.error) {
      console.error("[YT API Error]", data.error.message);
      return null;
    }
    return data.items?.[0]?.snippet?.title || null;
  } catch (err) {
    console.error("[YT API Fetch Error]", err.message);
    return null;
  }
}

async function uploadToSupabase(videoId, filePath, safeTitle) {
  if (!supabase) return null;
  try {
    const buffer = fs.readFileSync(filePath);
    const key = `${videoId}.mp3`;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(key, buffer, { contentType: "audio/mpeg", upsert: true });
    if (error) { console.error("[Supabase Upload Error]", error.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(key);
    console.log(`[Supabase] Uploaded: ${safeTitle} → ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error("[Supabase Error]", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Background conversion worker
// ─────────────────────────────────────────────
async function startConversion(videoId, clientTitle) {
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);

  // Already cached on disk
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
    jobs.set(videoId, { status: "ready", title: sanitize(clientTitle || videoId) });
    return;
  }

  // Resolve title: prefer YouTube Data API, fall back to client-provided or videoId
  const apiTitle = await fetchVideoTitle(videoId);
  const safeTitle = sanitize(apiTitle || clientTitle || videoId);
  jobs.set(videoId, { status: "preparing", title: safeTitle });
  console.log(`[Job] Starting: ${videoId} "${safeTitle}"`);

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytDlpPath = path.join(__dirname, "yt-dlp.exe");
    const ffmpegPath = ffmpegStatic;

    const ytDlpProc = spawn(ytDlpPath, [
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", "192K",
      "--ffmpeg-location", ffmpegPath,
      "-o", filePath,
      videoUrl
    ]);

    ytDlpProc.stderr.on("data", (data) => {
      // yt-dlp outputs progress here, we can selectively log or ignore
    });

    ytDlpProc.on("error", (err) => {
      console.error(`[yt-dlp Error] ${videoId}:`, err.message);
      jobs.set(videoId, { status: "failed", title: safeTitle });
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    ytDlpProc.on("close", async (code) => {
      if (code === 0 && fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
        console.log(`[Job] Done: ${videoId} "${safeTitle}"`);
        const supabaseUrl = await uploadToSupabase(videoId, filePath, safeTitle);
        jobs.set(videoId, { status: "ready", title: safeTitle, supabaseUrl });
      } else {
        console.error(`[Job] Failed (exit ${code}): ${videoId}`);
        jobs.set(videoId, { status: "failed", title: safeTitle });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });

  } catch (err) {
    console.error(`[Job Error] ${videoId}:`, err.message);
    jobs.set(videoId, { status: "failed", title: safeTitle });
  }
}

// ─────────────────────────────────────────────
// PHASE 1 — /api/prepare   (kick off conversion)
// ─────────────────────────────────────────────
app.get("/api/prepare", async (req, res) => {
  const { videoId, title } = req.query;
  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "videoId is required" });
  }

  const job = jobs.get(videoId);
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);

  if (job?.status === "ready" || (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024)) {
    return res.json({ status: "ready", videoId });
  }
  if (job?.status === "preparing") {
    return res.json({ status: "preparing", videoId });
  }

  // Fire-and-forget — don't await so the HTTP response returns immediately
  startConversion(videoId, title || "").catch(() => { });
  return res.json({ status: "preparing", videoId });
});

// ─────────────────────────────────────────────
// PHASE 2 — /api/status   (poll for readiness)
// ─────────────────────────────────────────────
app.get("/api/status", (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId is required" });

  const job = jobs.get(videoId);
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);

  if (!job) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
      return res.json({ status: "ready", videoId });
    }
    return res.json({ status: "not_started", videoId });
  }

  return res.json({ ...job, videoId });
});

// ─────────────────────────────────────────────
// PHASE 3 — /api/download   (serve the file)
// ─────────────────────────────────────────────
app.get("/api/download", (req, res) => {
  const { videoId, title } = req.query;
  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "videoId is required" });
  }

  const job = jobs.get(videoId);
  const filePath = path.join(DOWNLOADS_DIR, `${videoId}.mp3`);
  const fileName = sanitize(job?.title || title || videoId) + ".mp3";

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024) {
    // Stream local file with proper headers for all browsers/mobile
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.download(filePath, fileName);
  }

  if (job?.supabaseUrl) {
    // Fallback: redirect to Supabase hosted URL
    return res.redirect(302, job.supabaseUrl);
  }

  // File not ready — tell the client to start preparing first
  return res.status(202).json({
    status: job?.status || "not_started",
    message: "File is not ready. POST to /api/prepare first.",
  });
});

// ─────────────────────────────────────────────
// /api/latest-videos   (proxies YouTube Data API — key stays server-side)
// ─────────────────────────────────────────────
app.get("/api/latest-videos", async (req, res) => {
  if (!YT_API_KEY || !CHANNEL_ID) {
    return res.status(500).json({ error: "YT_API_KEY or CHANNEL_ID not configured" });
  }
  const maxResults = Math.min(parseInt(req.query.maxResults) || 20, 50);
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=${maxResults}&type=video&key=${YT_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const videos = (data.items || [])
      .map((item, i) => {
        const vid = item.id?.videoId;
        const snip = item.snippet;
        if (!vid || !snip) return null;
        const t = (snip.title || "").toLowerCase();
        if (t.includes("private video") || t.includes("deleted video")) return null;
        return {
          videoId: vid,
          title: snip.title,
          artist: snip.channelTitle,
          tag: i === 0 ? "Latest" : "Remix",
          thumbnail: snip.thumbnails?.high?.url || snip.thumbnails?.default?.url || `https://img.youtube.com/vi/${vid}/mqdefault.jpg`,
          publishedAt: snip.publishedAt,
          youtubeUrl: `https://www.youtube.com/watch?v=${vid}`,
        };
      })
      .filter(Boolean);

    return res.json({ videos, cached: false });
  } catch (err) {
    console.error("[latest-videos Error]", err.message);
    return res.status(500).json({ error: "Failed to fetch videos" });
  }
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    ytApiKey: !!YT_API_KEY,
    channelId: !!CHANNEL_ID,
    supabase: !!supabase,
    jobs: jobs.size,
    diskFiles: fs.readdirSync(DOWNLOADS_DIR).length,
  });
});

// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend listening on port ${PORT}`);
  console.log(`✅ YT_API_KEY  : ${YT_API_KEY ? "configured" : "⚠️  MISSING — set YT_API_KEY"}`);
  console.log(`✅ CHANNEL_ID  : ${CHANNEL_ID ? "configured" : "⚠️  MISSING — set CHANNEL_ID"}`);
  console.log(`✅ Supabase    : ${supabase ? "configured" : "not set (local-disk mode)"}`);
});
