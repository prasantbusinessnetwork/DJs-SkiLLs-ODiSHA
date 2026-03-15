import express from "express";
import { spawn } from "child_process";
import { downloadLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

router.get("/", downloadLimiter, async (req, res) => {
  let videoId = req.query.id || req.query.url;

  if (!videoId) {
    return res.status(400).json({ error: "missing_parameter", message: "Missing song ID or URL" });
  }

  // Normalise to full YouTube URL
  let youtubeUrl = videoId;
  if (!videoId.startsWith("http")) {
    youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }

  logger.info(`[Download] Request for: ${youtubeUrl}`);

  const title = (req.query.title || "audio").replace(/[^\w\s-]/gi, "").trim() || "audio";

  // Set response headers for MP3 download
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", `attachment; filename="${title}.mp3"`);
  res.setHeader("Transfer-Encoding", "chunked");

  // Stream audio directly using yt-dlp - the most reliable method
  const ytdlp = spawn("yt-dlp", [
    "--no-playlist",
    "-f", "bestaudio[ext=m4a]/bestaudio/best",
    "--extract-audio",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "-o", "-",          // Output to stdout
    "--no-warnings",
    "--no-progress",
    "--quiet",
    youtubeUrl
  ]);

  // Pipe yt-dlp stdout → HTTP response
  ytdlp.stdout.pipe(res);

  ytdlp.stderr.on("data", (data) => {
    logger.error(`[yt-dlp stderr] ${data.toString()}`);
  });

  ytdlp.on("error", (err) => {
    logger.error(`[yt-dlp spawn error] ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: "spawn_failed", message: "yt-dlp not found or failed to start" });
    } else {
      res.end();
    }
  });

  ytdlp.on("close", (code) => {
    if (code !== 0) {
      logger.error(`[yt-dlp] exited with code ${code}`);
    }
    if (!res.writableEnded) res.end();
  });

  // If client disconnects, kill yt-dlp
  req.on("close", () => {
    ytdlp.kill("SIGTERM");
  });
});

export default router;
