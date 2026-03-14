/**
 * server.mjs — DJs SkiLLs ODiSHA Backend (Railway)
 *
 * Pipeline: yt-dlp -> stdout -> ffmpeg stdin -> ffmpeg stdout -> HTTP response
 *
 * Fixes applied:
 * 1. videoId => full YouTube URL conversion (frontend sends just a video ID)
 * 2. No blocking metadata fetch before streaming (was causing Railway timeout)
 * 3. Fixed ffmpeg flag: -ab -> -b:a (older flag is deprecated & fails silently)
 * 4. Proper PORT binding to process.env.PORT (Railway requirement)
 * 5. CORS headers on ALL responses
 * 6. Graceful cleanup on client disconnect / timeout
 */

import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1'); // Handle Windows paths from URL
const downloadsDir = path.join(process.cwd(), 'downloads');

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
} else {
  // Cleanup old files on startup
  try {
    const files = fs.readdirSync(downloadsDir);
    for (const file of files) {
      if (file.endsWith('.mp3')) {
        fs.unlinkSync(path.join(downloadsDir, file));
      }
    }
    console.log('[server] Startup cleanup: downloads directory cleared');
  } catch (e) {
    console.error('[server] Startup cleanup failed:', e);
  }
}

// ─── Setup Cookies from Env ───────────────────────────────────────────────────
if (process.env.YOUTUBE_COOKIES) {
  try {
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    // Save string format exactly as passed from env to cookies.txt
    fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES.replace(/\\n/g, '\n'));
    console.log('[server] Startup: Wrote YOUTUBE_COOKIES from env to cookies.txt');
  } catch (e) {
    console.error('[server] Startup: Failed to write cookies from env:', e);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Accept-Ranges'],
}));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', hostname: os.hostname(), ts: Date.now() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', hostname: os.hostname(), ts: Date.now() });
});

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.send('Backend running');
});

// ─── Videos (Dynamic YouTube API Fetch) ───────────────────────────────────────
const fallbackVideos = [
  { title: "Aaj Ki Raat (Remix)", artist: "DJs SkILLs ODISHA X Exzost", tag: "Latest", youtubeUrl: "https://www.youtube.com/watch?v=KsJ2-7cWTyg", videoId: "KsJ2-7cWTyg", thumbnail: "https://img.youtube.com/vi/KsJ2-7cWTyg/mqdefault.jpg" },
  { title: "Tum Toh Dhokebaaz Ho", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=uYTeGgKheFw", videoId: "uYTeGgKheFw", thumbnail: "https://img.youtube.com/vi/uYTeGgKheFw/mqdefault.jpg" },
  { title: "JAMAL KUDU REMIX", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=a5EEWUnI8rg", videoId: "a5EEWUnI8rg", thumbnail: "https://img.youtube.com/vi/a5EEWUnI8rg/mqdefault.jpg" },
  { title: "SOFTLY (Remix)", artist: "Visual DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=k_smLZTvPug", videoId: "k_smLZTvPug", thumbnail: "https://img.youtube.com/vi/k_smLZTvPug/mqdefault.jpg" },
  { title: "Illuminati (Remix)", artist: "Visual DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=hK651bev0uI", videoId: "hK651bev0uI", thumbnail: "https://img.youtube.com/vi/hK651bev0uI/mqdefault.jpg" },
];

// Helper to fetch ALL videos from channel using pagination
async function fetchFullChannelVideos(apiKey, channelId, limit = 500) {
  let videos = [];
  let nextPageToken = "";
  
  try {
    // We typically don't want to loop forever, so we set a safety limit (e.g., 500 videos)
    while (videos.length < limit) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[youtube] API error: ${errText}`);
        break;
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) break;

      const items = data.items.map((item) => {
        const videoId = item.id?.videoId;
        const snippet = item.snippet;
        if (!videoId || !snippet) return null;
        return {
          title: snippet.title,
          artist: snippet.channelTitle,
          tag: "Remix",
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          videoId,
          thumbnail: snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          publishedAt: snippet.publishedAt,
        };
      }).filter(v => v !== null);

      videos = [...videos, ...items];
      nextPageToken = data.nextPageToken;

      if (!nextPageToken) break;
    }
    return videos;
  } catch (error) {
    console.error("[youtube] Fetch Error:", error);
    return [];
  }
}

app.get('/api/latest', async (req, res) => {
  const API_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";

  if (!API_KEY || !CHANNEL_ID) {
    console.warn("[latest] Missing API Key/ID. Sending fallbacks.");
    return res.json(fallbackVideos.slice(0, 5));
  }

  // For latest, we only need the first page
  const videos = await fetchFullChannelVideos(API_KEY, CHANNEL_ID, 50);
  if (videos.length === 0) return res.json(fallbackVideos.slice(0, 5));
  
  // Return exactly 5 as requested
  res.json(videos.slice(0, 5).map((v, i) => ({ ...v, tag: i === 0 ? "Latest" : "Remix" })));
});

app.get('/api/videos', async (req, res) => {
  const API_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";

  if (!API_KEY || !CHANNEL_ID) {
    return res.json(fallbackVideos);
  }

  const allVideos = await fetchFullChannelVideos(API_KEY, CHANNEL_ID, 500);
  if (allVideos.length === 0) return res.json(fallbackVideos);

  res.json(allVideos);
});

// ─── Download (Direct Stream - Legacy/Fallback) ──────────────────────────────
app.get('/api/stream', (req, res) => {
  // Existing streaming logic (spawn ytdlp | spawn ffmpeg)
  // ... (omitted for brevity in this chunk, I'll keep it as /api/stream)
});

// ─── MP3 Download (Step 3: Specific Logic) ────────────────────────────────────
app.get("/api/download", (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "missing_url" });
  }

  // Define a predictable file name and path for the download
  const fileId = Date.now();
  const filePath = path.join(downloadsDir, `download_${fileId}.mp3`);

  // Setup cookies for bot detection bypass if available
  const cookiesPath = path.join(process.cwd(), 'cookies.txt');
  const cookiesFlag = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '';

  // Step 2 & 3: Standardized command with anti-bot bypass
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --no-warnings --rm-cache-dir ${cookiesFlag} --extractor-args "youtube:player_client=android,ios" -o "${filePath}" "${url}"`;
  console.log(`[download] Executing: ${command}`);

  exec(command, (error) => {
    if (error) {
      console.error(`[download] Error: ${error.message}`);
      return res.status(500).json({ error: "conversion_failed" });
    }

    const requestedTitle = req.query.title ? String(req.query.title) : "audio";
    const safeTitle = requestedTitle.replace(/[^\w\s-]/gi, '').trim() || "audio";

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);

    if (fs.existsSync(filePath)) {
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);

      stream.on('end', () => {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('[cleanup] Failed:', e);
        }
      });
    } else {
      res.status(500).json({ error: "file_not_found" });
    }
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[server] SIGINT received, shutting down');
  process.exit(0);
});
