import express from "express";
import cors from "cors";
import ytdl from "ytdl-core";

const app = express();

app.use(cors());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server running" });
});

app.get("/api/download", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, "");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${title}.mp3"`);

    ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly"
    }).pipe(res);

  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "download_failed",
        message: "Audio extraction failed"
      });
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
