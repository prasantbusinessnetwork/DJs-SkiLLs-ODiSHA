import express from "express";
import cors from "cors";
import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Paths to binaries
const YTDLP_PATH = path.join(__dirname, "yt-dlp.exe");
const FFMPEG_PATH = path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg.exe");
const CHANNEL_URL = "https://www.youtube.com/@DJsSkiLLsODiSHA/videos";

let videoCache = {
  data: null,
  timestamp: 0,
  ttl: 10 * 60 * 1000 // 10 minutes cache
};

let fetching = false;

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

app.get("/api/download", async (req, res) => {
  try {
    const { videoId } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "videoId query param is required" });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Get video title first for the filename
    let safeTitle = videoId;
    try {
      const titleBuffer = execSync(`"${YTDLP_PATH}" --get-title "${videoUrl}"`);
      const rawTitle = titleBuffer.toString().trim();
      safeTitle = rawTitle
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || videoId;
    } catch (titleErr) {
      console.error("Error getting title:", titleErr.message);
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}.mp3"`
    );
    res.setHeader("Content-Type", "audio/mpeg");

    // Spawn yt-dlp to stream the audio directly
    // -x: extract audio
    // --audio-format mp3: convert to mp3
    // --ffmpeg-location: point to our ffmpeg
    // -o -: output to stdout
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
      // Log progress or errors from yt-dlp
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
      res.end();
    });

    // Handle client disconnect
    req.on("close", () => {
      ytDlp.kill();
    });

  } catch (err) {
    console.error("Download error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.end();
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Download server running on port ${PORT} (0.0.0.0)`);
});

