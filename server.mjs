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

// Allow all origins and expose Content-Disposition so mobile browsers
// can read the filename from the download stream
app.use(cors({
  origin: "*",
  exposedHeaders: ["Content-Disposition", "Content-Type", "Content-Length"],
}));

// Paths to binaries
const YTDLP_PATH = path.join(__dirname, "yt-dlp.exe");
const FFMPEG_PATH = path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg.exe");
const CHANNEL_URL = "https://www.youtube.com/@DJsSkiLLsODiSHA/videos";

// YouTube Data API (for latest videos endpoint)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.CHANNEL_ID;

// Supabase (optional) — used for logging downloads to the database when configured
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
  ttl: 10 * 60 * 1000 // 10 minutes cache
};

let fetching = false;

// Simple in-memory cache for latest videos endpoint to minimize YouTube API calls
let latestVideosCache = {
  data: null,
  timestamp: 0,
  ttlMs: 2 * 60 * 1000, // 2 minutes
};

function fetchVideosBackground() {
  if (fetching) return;
  fetching = true;
  console.log("Fetching fresh videos from YouTube in background...");
  
  const ytDlp = spawn(YTDLP_PATH, [
    "--flat-playlist",
    "--playlist-items", "1-30", 
    "--print", "%(id)s|%(title)s|%(uploader)s|%(upload_date)s",
    CHANNEL_URL
  ]);

  let output = "";
  ytDlp.stdout.on("data", (data) => {
    output += data.toString();
  });

  ytDlp.on("close", (code) => {
    fetching = false;
    if (code !== 0) {
      console.warn("Background fetch failed, keeping old cache if available");
      return;
    }

    const lines = output.trim().split("\n").filter(line => line.includes("|"));
    const videos = lines.map(line => {
      const [id, title, uploader, date] = line.split("|");
      return {
        videoId: id,
        title: title,
        artist: uploader,
        tag: "Remix",
        youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        publishedAt: date
      };
    });

    videoCache = {
      data: videos,
      timestamp: Date.now(),
      ttl: 10 * 60 * 1000
    };
    console.log("Background cache updated successfully");
  });
}

function sanitizeFileName(raw) {
  return raw
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// Update cache every 9 minutes so it never expires (10 min ttl)
setInterval(fetchVideosBackground, 9 * 60 * 1000);
// Initial warm-up
fetchVideosBackground();

app.get("/api/videos", async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 15;
    
    // Provide instant response from memory cache
    if (videoCache.data && videoCache.data.length > 0) {
      return res.json(videoCache.data.slice(0, maxResults));
    }
    
    // If cache is empty (just spinning up), return 503 so frontend gracefully falls back to direct API
    return res.status(503).json({ error: "Cache warming up" });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Lightweight YouTube Data API proxy.
 * Returns the latest N videos from the configured channel as clean JSON.
 *
 * Environment:
 * - YOUTUBE_API_KEY: server-side API key
 * - CHANNEL_ID: YouTube channel ID
 */
app.get("/api/latest-videos", async (req, res) => {
  try {
    if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
      return res.status(500).json({ error: "YouTube API not configured" });
    }

    const maxResultsRaw = parseInt(req.query.maxResults, 10);
    const maxResults =
      Number.isFinite(maxResultsRaw) && maxResultsRaw > 0 && maxResultsRaw <= 20
        ? maxResultsRaw
        : 5;

    // Serve from in-memory cache when fresh
    const now = Date.now();
    if (
      latestVideosCache.data &&
      now - latestVideosCache.timestamp < latestVideosCache.ttlMs
    ) {
      return res.json({
        videos: latestVideosCache.data.slice(0, maxResults),
        cached: true,
      });
    }

    const searchParams = new URLSearchParams({
      part: "snippet",
      channelId: YOUTUBE_CHANNEL_ID,
      order: "date",
      type: "video",
      maxResults: String(maxResults),
      key: YOUTUBE_API_KEY,
    });

    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    );

    if (!ytRes.ok) {
      const errorData = await ytRes.json().catch(() => ({}));
      console.error("YouTube latest-videos API error:", errorData);
      return res.status(ytRes.status).json({
        error: "YouTube API error",
        status: ytRes.status,
      });
    }

    const data = await ytRes.json();
    const items = Array.isArray(data.items) ? data.items : [];

    const videos = items
      .map((item) => {
        const videoId = item?.id?.videoId;
        const snippet = item?.snippet;
        if (!videoId || !snippet) return null;

        const title = snippet.title || "";
        const normalizedTitle = title.toLowerCase();
        if (
          normalizedTitle.includes("private video") ||
          normalizedTitle.includes("deleted video")
        ) {
          return null;
        }

        const thumbnails = snippet.thumbnails || {};
        const thumbnailUrl =
          thumbnails.medium?.url ||
          thumbnails.default?.url ||
          `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        return {
          videoId,
          title,
          thumbnail: thumbnailUrl,
          publishedAt: snippet.publishedAt,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          artist: snippet.channelTitle,
          tag: "Latest",
        };
      })
      .filter(Boolean);

    latestVideosCache = {
      data: videos,
      timestamp: now,
      ttlMs: latestVideosCache.ttlMs,
    };

    return res.json({ videos, cached: false });
  } catch (err) {
    console.error("latest-videos endpoint error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Async helper — fetch the video title via yt-dlp without blocking the event loop.
 * Falls back to the videoId if anything goes wrong.
 */
function getVideoTitle(videoUrl) {
  return new Promise((resolve) => {
    const proc = spawn(YTDLP_PATH, ["--get-title", "--no-warnings", videoUrl]);
    let out = "";
    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.on("close", () => {
      const raw = out.trim();
      const safe = sanitizeFileName(raw);
      resolve(safe || null);
    });
    proc.on("error", () => resolve(null));
    // 10 s timeout — don't block the download indefinitely
    setTimeout(() => { proc.kill(); resolve(null); }, 10000);
  });
}

app.get("/api/download", async (req, res) => {
  try {
    const { videoId, title } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "videoId query param is required" });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Prefer client-provided title (matches card UI), falling back to yt-dlp lookup
    // and finally the raw videoId.
    let safeTitle;
    if (typeof title === "string" && title.trim()) {
      safeTitle = sanitizeFileName(title);
    } else {
      const fetchedTitle = await getVideoTitle(videoUrl);
      safeTitle = fetchedTitle || videoId;
    }

    // RFC 5987 encoded filename — works on all mobile browsers (iOS Safari,
    // Android Chrome) and handles non-ASCII characters in song names.
    const encodedFilename = encodeURIComponent(`${safeTitle}.mp3`).replace(/'/g, "%27");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}.mp3"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader("Content-Type", "audio/mpeg");
    // Tell CDN not to cache download responses
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Origin");

    // Fire-and-forget logging to Supabase if configured
    if (supabase) {
      supabase
        .from("downloads")
        .insert({
          video_id: videoId,
          title: safeTitle,
          downloaded_at: new Date().toISOString(),
        })
        .then((result) => {
          if (result.error) {
            console.error("Supabase log error:", result.error.message);
          }
        })
        .catch((e) => {
          console.error("Supabase log exception:", e.message);
        });
    }

    // Spawn yt-dlp to stream the audio directly to the response
    const ytDlp = spawn(YTDLP_PATH, [
      "-x",
      "--audio-format", "mp3",
      "--audio-quality", "192K",
      "--ffmpeg-location", FFMPEG_PATH,
      "-o", "-",
      videoUrl
    ]);

    ytDlp.stdout.pipe(res);

    ytDlp.stderr.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("ERROR")) {
        console.error("yt-dlp error:", msg);
      }
    });

    ytDlp.on("close", (code) => {
      if (code !== 0) {
        console.error(`yt-dlp process exited with code ${code}`);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download audio" });
        }
      }
      if (!res.writableEnded) res.end();
    });

    // Handle client disconnect (mobile user navigating away)
    req.on("close", () => {
      ytDlp.kill();
    });

  } catch (err) {
    console.error("Download error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Download server running on port ${PORT} (0.0.0.0)`);
});

