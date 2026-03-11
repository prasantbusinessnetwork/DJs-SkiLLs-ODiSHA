import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs";

// Used only for local Windows environment.
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants from Env
const YT_API_KEY = process.env.YT_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";

app.use(cors({ exposedHeaders: ["Content-Disposition"] }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Identify OS and Paths
const isWin = process.platform === "win32";
const YTDLP_PATH = isWin ? path.join(__dirname, "yt-dlp.exe") : "yt-dlp";

// Windows-specific FFMPEG handling
const FFMPEG_BIN_ROOT = isWin ? path.join(__dirname, "bin") : "/usr/bin";
if (isWin) {
  if (!fs.existsSync(FFMPEG_BIN_ROOT)) fs.mkdirSync(FFMPEG_BIN_ROOT, { recursive: true });
}

// Memory caching for latest Youtube videos
let videoCache = { data: null, fetchedAt: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ----------------------------------------------------
// 1. Fetch Latest Videos Endpoint
// ----------------------------------------------------
app.get("/api/latest-videos", async (req, res) => {
  const maxResults = parseInt(req.query.maxResults) || 15;

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
    res.json({ videos: videos.slice(0, maxResults) });
  } catch (err) {
    console.error("[YouTube API Error]:", err.message);
    if (videoCache.data) return res.json({ videos: videoCache.data.slice(0, maxResults) });
    res.status(500).json({ error: "Failed to fetch videos from YouTube" });
  }
});

// ----------------------------------------------------
// 2. Direct Stream Audio Download Endpoint (The Main Fix)
// ----------------------------------------------------
// This replaces the old "prepare -> status -> download" flow 
// completely. It sends the audio directly as a stream.
function sanitize(name) {
  return (name || "download").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, " ").trim().slice(0, 100) || "download";
}

app.get("/api/download", (req, res) => {
  let { videoId } = req.query;
  const { title } = req.query;

  // We allow frontend to still call /api/prepare, we will just pipe everything through /api/download
  if (!videoId) return res.status(400).json({ error: "Video ID missing" });

  try {
    const rawTitle = title || videoId || "download";
    // Sanitize specifically to prevent HTTP Header splitting and invalid chars
    const safeAscii = rawTitle.replace(/[^\w\s-]/g, "").replace(/\s+/g, " ").trim().slice(0, 50) || "download";
    const encodedTitle = encodeURIComponent(rawTitle);

    // Set headers to trigger file download dialog
    // Use fallback ASCII filename + standard UTF-8 encoded filename
    res.setHeader("Content-Disposition", `attachment; filename="${safeAscii}.mp3"; filename*=UTF-8''${encodedTitle}.mp3`);
    res.setHeader("Content-Type", "audio/mpeg");

    console.log(`[Stream] Starting download stream for: ${videoId}`);

    const FFMPEG_CMD = isWin ? path.join(FFMPEG_BIN_ROOT, "ffmpeg.exe") : "ffmpeg";

    const ytArgs = [
      "-f", "bestaudio",
      "--no-warnings", "-q",
      "--no-check-certificate", "--no-cache-dir", "--no-part", "--no-playlist",
      "--extractor-args", "youtube:player-client=android,web,mweb,ios",
      "--force-ipv4",
      "-o", "-", // Crucial: Streams binary directly to stdout
      `https://www.youtube.com/watch?v=${videoId}`
    ];

    const ffArgs = [
      "-i", "pipe:0",          // Input from yt-dlp
      "-f", "mp3",             // Force format to MP3
      "-b:a", "192k",          // Audio bitrate
      "pipe:1"                 // Output MP3 to stdout
    ];

    const ytDlpProc = spawn(YTDLP_PATH, ytArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    const ffmpegProc = spawn(FFMPEG_CMD, ffArgs, { stdio: ['pipe', 'pipe', 'ignore'] });

    // Ensure we don't crash Node process silently on spawn failures
    const handleProcError = (procName) => (err) => {
      console.error(`[${procName}] Spawn/Stream error:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to start ${procName} stream` });
      }
    };

    ytDlpProc.on("error", handleProcError("yt-dlp"));
    ffmpegProc.on("error", handleProcError("ffmpeg"));
    ytDlpProc.stdout.on("error", handleProcError("ytDlpProc.stdout"));
    ffmpegProc.stdin.on("error", handleProcError("ffmpegProc.stdin"));
    ffmpegProc.stdout.on("error", handleProcError("ffmpegProc.stdout"));
    res.on("error", () => {
      console.log(`[Stream] Response stream closed with error for ${videoId}`);
      cleanup();
    });

    let stderr = "";
    ytDlpProc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Pipe audio natively to ffmpeg, then buffer MP3 out to network response
    ytDlpProc.stdout.pipe(ffmpegProc.stdin);
    ffmpegProc.stdout.pipe(res);

    const cleanup = () => {
      try { ytDlpProc.kill("SIGKILL"); } catch (e) { }
      try { ffmpegProc.kill("SIGKILL"); } catch (e) { }
    };

    req.on("close", () => {
      console.log(`[Stream] Client cancelled download for ${videoId}`);
      cleanup();
    });

    ytDlpProc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[yt-dlp Failed] ${videoId} (Exit Code: ${code})\n${stderr}`);
        try { fs.appendFileSync(path.join(__dirname, "last_error.log"), `[${new Date().toISOString()}] Stream Failed: ${videoId} (Code: ${code})\n${stderr}\n`); } catch (e) { }

        if (!res.headersSent) {
          res.status(500).json({ error: "Temporary YouTube block or processing error. Please retry." });
        } else {
          try { ffmpegProc.kill("SIGKILL"); } catch (e) { }
          res.end();
        }
      }
    });

    ffmpegProc.on("close", (code) => {
      if (code === 0) {
        console.log(`[Stream] Success: ${videoId} converted to MP3`);
      } else {
        console.error(`[Stream] FFmpeg closed with Code ${code} for ${videoId}`);
      }
    });

  } catch (err) {
    console.error("Backend Error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to initialize stream." });
  }
});

// Since Frontend might still call prepare->status->download flow
// we need to keep backwards compatibility to avoid breaking frontend immediately
app.get("/api/prepare", (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: "videoId required" });

  // We tell the frontend it's instantly ready, so frontend just calls /api/download right away
  return res.json({ status: "ready", videoId });
});

app.get("/api/status", (req, res) => {
  const { videoId } = req.query;
  // Always trick frontend into thinking it's ready, so it jumps straight to streaming
  return res.json({ status: "ready", videoId });
});

// ----------------------------------------------------
// 3. Health & Utility
// ----------------------------------------------------
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend live on port ${PORT}`);
});
