import express from "express";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());

app.get("/", (_req, res) => {
  res.send("DJs SkiLLs ODiSHA download helper server is running.");
});

app.get("/api/download", async (req, res) => {
  try {
    const { videoId } = req.query;

    if (!videoId || typeof videoId !== "string") {
      return res.status(400).json({ error: "videoId query param is required" });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const info = await ytdl.getInfo(videoUrl);
    const rawTitle = info.videoDetails?.title || videoId;
    const safeTitle =
      rawTitle
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || videoId;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}.mp3"`
    );
    res.setHeader("Content-Type", "audio/mpeg");

    const audioStream = ytdl(videoUrl, {
      quality: "highestaudio",
    });

    ffmpeg(audioStream)
      .audioBitrate(192)
      .format("mp3")
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        if (!res.headersSent) {
          res
            .status(500)
            .json({ error: "Failed to process audio. Please try again." });
        } else {
          res.end();
        }
      })
      .pipe(res, { end: true });
  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to download audio" });
    } else {
      res.end();
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Download server running on http://localhost:${PORT}`);
});

