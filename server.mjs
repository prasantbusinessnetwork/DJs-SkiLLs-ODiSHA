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

app.get("/api/videos", async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults) || 15;
    const now = Date.now();

    // Check cache first
    if (videoCache.data && (now - videoCache.timestamp < videoCache.ttl)) {
      console.log("Serving videos from cache");
      return res.json(videoCache.data.slice(0, maxResults));
    }

    console.log("Fetching fresh videos from YouTube...");
    
    // Use yt-dlp to get the latest videos
    // --flat-playlist: don't download, just list
    // --playlist-items: limit results (fetch 30 to have a good cache size)
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
      if (code !== 0) {
        // If fetch fails but we have old cache, use it as fallback
        if (videoCache.data) {
          console.warn("Fetch failed, falling back to expired cache");
          return res.json(videoCache.data.slice(0, maxResults));
        }
        return res.status(500).json({ error: "Failed to fetch videos" });
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

      // Update cache
      videoCache = {
        data: videos,
        timestamp: now,
        ttl: 10 * 60 * 1000
      };

      res.json(videos.slice(0, maxResults));
    });
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

app.listen(PORT, () => {
  console.log(`Download server running on http://localhost:${PORT}`);
});

