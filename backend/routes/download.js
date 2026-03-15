import express from "express";
import { downloadLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// List of working Cobalt API instances (fallback chain)
const COBALT_INSTANCES = [
  "https://cobalt.api.timelessnesses.me",
  "https://co.wuk.sh",
  "https://cobalt.tools",
];

async function getCobaltAudioUrl(youtubeUrl, instance) {
  const res = await fetch(`${instance}/api/json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: youtubeUrl,
      isAudioOnly: true,
      aFormat: "mp3",
      filenamePattern: "basic",
    }),
    signal: AbortSignal.timeout(10000), // 10 sec timeout per instance
  });

  if (!res.ok) return null;
  const data = await res.json();

  // Cobalt returns: { status: "redirect" | "stream" | "error", url: "..." }
  if ((data.status === "redirect" || data.status === "stream") && data.url) {
    return data.url;
  }
  return null;
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

  logger.info(`Download request: ${youtubeUrl}`);

  // Try Cobalt instances in order until one works
  let audioUrl = null;
  for (const instance of COBALT_INSTANCES) {
    try {
      audioUrl = await getCobaltAudioUrl(youtubeUrl, instance);
      if (audioUrl) {
        logger.info(`Got audio URL from ${instance}`);
        break;
      }
    } catch (err) {
      logger.error(`Cobalt instance ${instance} failed: ${err.message}`);
    }
  }

  if (!audioUrl) {
    // Last-resort: send user directly to YouTube if everything fails
    return res.redirect(`https://www.youtube.com/watch?v=${videoId}`);
  }

  // Redirect user directly to the pre-signed audio URL
  // This means ZERO streaming load on Railway and works on all browsers/mobile
  return res.redirect(302, audioUrl);
});

export default router;
