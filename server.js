import express from "express"
import cors from "cors"
import ytdl from "@distube/ytdl-core" // Using the recommended, updated fork

const app = express()

// Permissive CORS for Vercel -> Railway communication
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  exposedHeaders: ["Content-Disposition"]
}))

// Add basic healthcheck for Railway
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/prepare", (req, res) => res.json({ status: "ready" })); // legacy frontend mock
app.get("/api/status", (req, res) => res.json({ status: "ready" })); // legacy frontend mock

// User's Exact Requested Main Download Endpoint
app.get("/api/download", async (req, res) => {
  try {
    let url = req.query.url

    if (!url) {
      return res.status(400).json({
        error: "YouTube URL required"
      })
    }

    if (!url.startsWith("http")) {
      url = `https://www.youtube.com/watch?v=${url}`
    }

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({
        error: "Invalid YouTube Video ID or URL"
      })
    }

    const info = await ytdl.getInfo(url)

    // Ensure we have an audio format available before streaming
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    if (audioFormats.length === 0) {
      return res.status(400).json({
        error: "Could not retrieve audio format or info. No audio streams available."
      });
    }

    const title = info.videoDetails.title
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "_")

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${title}.mp3"`
    )

    res.setHeader(
      "Content-Type",
      "audio/mpeg"
    )

    console.log(`[Download] Starting stream: ${title}`)

    // Stream directly as requested, using highWaterMark for stability
    ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25
    }).pipe(res)

  } catch (error) {
    console.error(`[Error Streaming ${req.query.url}]:`, error.message)

    // Catch common bot protection issues and return proper JSON if headers not sent
    if (!res.headersSent) {
      if (error.message.includes("Sign in to confirm")) {
        return res.status(403).json({ error: "YouTube bot detection triggered. Try another video." });
      }
      res.status(500).json({
        error: "Failed to download audio"
      })
    }
  }
})

// Mocks for local dev/legacy fetching
app.get("/api/latest-videos", async (req, res) => {
  try {
    const API_KEY = process.env.YT_API_KEY;
    const CHANNEL_ID = process.env.CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
    if (!API_KEY) return res.status(500).json({ error: "API Key Missing" });

    const fetchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&maxResults=20&order=date&type=video&key=${API_KEY}`;
    const resp = await fetch(fetchUrl);
    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const videos = (data.items || []).map(v => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      artist: v.snippet.channelTitle,
      youtubeUrl: `https://www.youtube.com/watch?v=${v.id.videoId}`,
      thumbnail: v.snippet.thumbnails?.high?.url || "",
      publishedAt: v.snippet.publishedAt,
    })).filter(v => v.videoId);

    res.json({ videos });
  } catch (e) {
    res.json({ videos: [] });
  }
});

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
})
