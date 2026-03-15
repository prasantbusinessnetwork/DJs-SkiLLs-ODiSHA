import express from "express";
import { downloadLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Cobalt API v2 instances (updated 2024)
const COBALT_INSTANCES = [
  "https://cobalt.api.timelessnesses.me",
  "https://cobalt.synzr.space",
  "https://cbl.0x7f.cc",
  "https://api.cobalt.tools",
];

async function getCobaltAudioUrl(youtubeUrl, instance) {
  try {
    const res = await fetch(`${instance}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: youtubeUrl,
        downloadMode: "audio",
        audioFormat: "mp3",
        filenameStyle: "basic",
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      // Try legacy /api/json endpoint as fallback for older instances
      const res2 = await fetch(`${instance}/api/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ url: youtubeUrl, isAudioOnly: true, aFormat: "mp3", filenamePattern: "basic" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res2.ok) return null;
      const data2 = await res2.json();
      if ((data2.status === "redirect" || data2.status === "stream") && data2.url) return data2.url;
      return null;
    }

    const data = await res.json();
    // v2 API returns { status: "redirect" | "tunnel" | "error", url: "..." }
    if ((data.status === "redirect" || data.status === "tunnel" || data.status === "stream") && data.url) {
      return data.url;
    }
    return null;
  } catch (e) {
    logger.error(`Cobalt ${instance} error: ${e.message}`);
    return null;
  }
}

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

  // Try each Cobalt instance in order
  let audioUrl = null;
  for (const instance of COBALT_INSTANCES) {
    audioUrl = await getCobaltAudioUrl(youtubeUrl, instance);
    if (audioUrl) {
      logger.info(`[Download] Got URL from: ${instance}`);
      break;
    }
  }

  if (!audioUrl) {
    logger.error(`[Download] All Cobalt instances failed for: ${youtubeUrl}`);
    // Fallback: redirect to YouTube video so user is not left with an error
    const vid = youtubeUrl.includes("v=") ? youtubeUrl.split("v=")[1].split("&")[0] : videoId;
    return res.redirect(`https://www.youtube.com/watch?v=${vid}`);
  }

  // 302 redirect to the direct audio URL — browser handles the download
  return res.redirect(302, audioUrl);
});

export default router;
