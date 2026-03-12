import "dotenv/config";
import express from "express";
import cors from "cors";
import youtubedl from "youtube-dl-exec";
import ffmpegPath from "ffmpeg-static";

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. MIDDLEWARE ---
app.use(cors({ origin: "*" }));
app.use(express.json());

// --- 2. HEALTH ENDPOINT ---
app.get("/api/health", (req, res) => {
  res.json({ status: "server running" });
});

// --- 3. DOWNLOAD ENDPOINT ---
app.get("/api/download", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing video URL (parameter 'url')" });
  }

  console.log(`[Job] Starting streaming download for: ${videoUrl}`);

  try {
    // Set proper download headers
    res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");
    res.setHeader("Content-Type", "audio/mpeg");

    /**
     * youtube-dl-exec streaming
     * Using native yt-dlp via youtube-dl-exec
     */
    const stream = youtubedl.exec(videoUrl, {
      extractAudio: true,
      audioFormat: "mp3",
      output: "-",
      ffmpegLocation: ffmpegPath,
      noCheckCertificate: true,
      noPlaylist: true,
      format: "bestaudio/best",
      // Bypass YouTube bot detection
      addHeader: [
        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ]
    });

    // Pipe stdout to response
    stream.stdout.pipe(res);

    stream.stderr.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("ERROR")) console.error(`[ytdl] ${msg}`);
    });

    stream.on("error", (err) => {
      console.error("[Fatal Error]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download failed" });
      }
    });

    // Handle client disconnect
    req.on("close", () => {
      try {
        stream.kill("SIGKILL");
      } catch (e) { /* ignore */ }
    });

  } catch (err) {
    console.error("[Exception]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error" });
    }
  }
});

// --- 4. YOUTUBE API CACHING (Preserving site feature) ---
let cachedVideos = [];
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000;

app.get("/api/latest-videos", async (req, res) => {
  const API_KEY = process.env.YT_API_KEY;
  const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";

  const now = Date.now();
  if (cachedVideos.length > 0 && (now - cacheTimestamp < CACHE_TTL)) {
    return res.json({ videos: cachedVideos });
  }

  if (!API_KEY) {
    return res.json({ videos: cachedVideos, warning: "API key missing" });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=20&order=date&type=video&key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.error) {
      return res.json({ videos: cachedVideos, warning: data.error.message });
    }

    const videos = (data.items || []).map(v => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumbnail: v.snippet.thumbnails?.high?.url || "",
      publishedAt: v.snippet.publishedAt,
    })).filter(v => v.videoId);

    if (videos.length > 0) {
      cachedVideos = videos;
      cacheTimestamp = Date.now();
    }

    res.json({ videos });
  } catch (err) {
    res.json({ videos: cachedVideos, warning: "Fetch failed" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 NE-COMPATIBLE YT SERVER READY | PORT ${PORT}`);
});
