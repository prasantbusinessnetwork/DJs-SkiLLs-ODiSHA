import express from "express";
import ytdl from "ytdl-core";
import { downloadLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";
import { getStorageStream } from "../utils/storage.js";
import { getFromCache, setInCache } from "../utils/cache.js";

const router = express.Router();

// Secure download endpoint with Rate Limiter
router.get("/", downloadLimiter, async (req, res, next) => {
  // Support either `id` or `url`
  let songId = req.query.id || req.query.url;
  
  if (!songId) {
    return res.status(400).json({ error: "missing_parameter", message: "Missing song ID or URL" });
  }

  try {
    // 1. Log the download sequence
    logger.download(req, songId);

    // 2. Check if the song exists in object storage (Supabase/S3/R2)
    const storageStream = await getStorageStream(songId);
    
    // Check if the title is cached
    let title = getFromCache(`title-${songId}`);

    if (!title) {
        try {
            // Attempt to get the actual title from YouTube if we don't have it
            let ytUrl = songId;
            if (!songId.includes("youtube.com") && !songId.includes("youtu.be")) {
                ytUrl = `https://www.youtube.com/watch?v=${songId}`;
            }
            const info = await ytdl.getInfo(ytUrl);
            title = info.videoDetails.title.replace(/[^\w\s-]/gi, "");
            setInCache(`title-${songId}`, title, 86400); // cache for 1 day
        } catch (e) {
            title = songId.replace(/[^\w\s-]/gi, ""); // Fallback title
        }
    }

    // Set standard headers
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${title}.mp3"`);

    if (storageStream) {
      logger.info(`Streaming from S3 Storage for: ${songId}`);
      // Stream memory-efficiently from S3 to Client
      storageStream.pipe(res);
      return;
    }

    // 3. Fallback: Streaming directly from YouTube via ytdl-core (If S3 fail/not configured)
    logger.info(`Streaming directly from YouTube for: ${songId}`);
    
    let ytUrl = songId;
    if (!songId.includes("youtube.com") && !songId.includes("youtu.be")) {
      ytUrl = `https://www.youtube.com/watch?v=${songId}`;
    }

    const audioStream = ytdl(ytUrl, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25 // 32MB buffer to handle lag but prevent memory overload
    });

    // Handle stream errors properly
    audioStream.on('error', (streamErr) => {
      logger.error("Audio streaming error", streamErr);
      if (!res.headersSent) {
        res.status(502).json({ error: "stream_failed", message: "Failed to stream audio data" });
      } else {
        res.end();
      }
    });

    // Pipe the stream continuously, never loading it all into memory
    audioStream.pipe(res);

  } catch (error) {
    logger.error("Download failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "download_failed",
        message: error.message || "Failed to initiate download"
      });
    }
  }
});

export default router;
