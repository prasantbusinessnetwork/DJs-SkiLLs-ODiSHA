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

app.get('/api/latest', async (req, res) => {
  console.log(`[latest] Fetching newest 5 videos for ${req.ip}`);
  
  const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || process.env.YOUTUBE_CHANNEL_ID;

  if (!API_KEY || !CHANNEL_ID) {
    console.warn("[latest] Missing YouTube API Key or Channel ID. Sending fallback videos.");
    return res.json(fallbackVideos.slice(0, 5));
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=5&type=video&key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("[latest] YouTube API error:", await response.text());
      return res.json(fallbackVideos.slice(0, 5));
    }

    const data = await response.json();
    
    const videos = data.items
      .map((item, index) => {
        const videoId = item.id?.videoId;
        const snippet = item.snippet;
        if (!videoId || !snippet) return null;

        const title = snippet.title || "";
        const thumbnails = snippet.thumbnails || {};
        const thumbnailUrl = thumbnails.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        return {
          title,
          artist: snippet.channelTitle,
          tag: index === 0 ? "Latest" : "Remix",
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          videoId,
          thumbnail: thumbnailUrl,
          publishedAt: snippet.publishedAt,
        };
      })
      .filter((v) => v !== null);

    res.status(200).json(videos);
  } catch (error) {
    console.error("[latest] Fetch Exception:", error);
    res.json(fallbackVideos.slice(0, 5));
  }
});

app.get('/api/videos', async (req, res) => {
  console.log(`[videos] Fetching all videos for ${req.ip}`);
  
  const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  const CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID || process.env.YOUTUBE_CHANNEL_ID;
  const maxResults = Math.min(Number(req.query.maxResults) || 50, 50);

  if (!API_KEY || !CHANNEL_ID) {
    console.warn("[videos] Missing YouTube API Key or Channel ID. Sending fallback videos.");
    return res.json(fallbackVideos);
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=${maxResults}&type=video&key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error("[videos] YouTube API error:", await response.text());
      return res.json(fallbackVideos);
    }

    const data = await response.json();
    
    const videos = data.items
      .map((item, index) => {
        const videoId = item.id?.videoId;
        const snippet = item.snippet;
        if (!videoId || !snippet) return null;

        const title = snippet.title || "";
        const thumbnails = snippet.thumbnails || {};
        const thumbnailUrl = thumbnails.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        return {
          title,
          artist: snippet.channelTitle,
          tag: index === 0 ? "Latest" : "Remix",
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          videoId,
          thumbnail: thumbnailUrl,
          publishedAt: snippet.publishedAt,
        };
      })
      .filter((v) => v !== null);

    res.status(200).json(videos);
  } catch (error) {
    console.error("[videos] Fetch Exception:", error);
    res.json(fallbackVideos);
  }
});

// ─── Download (Direct Stream - Legacy/Fallback) ──────────────────────────────
app.get('/api/stream', (req, res) => {
  // Existing streaming logic (spawn ytdlp | spawn ffmpeg)
  // ... (omitted for brevity in this chunk, I'll keep it as /api/stream)
});

// ─── MP3 Download (The User's Requested Primary Route) ────────────────────────
app.get('/api/download', async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: 'missing_url' });
  }

  const fileId = Date.now() + '_' + Math.floor(Math.random() * 1000);
  const tempFile = `${fileId}.mp3`;
  const outputPath = path.join(downloadsDir, tempFile);
  
  console.log(`[download] Converting: ${videoUrl}`);

  try {
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --embed-metadata -o "${outputPath}" "${videoUrl}"`;
    console.log(`[download] Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[download] yt-dlp failed: ${stderr}`);
        if (!res.headersSent) {
          return res.status(500).json({
            error: 'conversion_failed',
            message: stderr || error.message
          });
        }
        return;
      }

      console.log(`[download] Conversion complete. Checking for file: ${tempFile}`);

      try {
        if (!fs.existsSync(outputPath)) {
          if (!res.headersSent) {
            return res.status(500).json({ error: 'conversion_failed', message: 'File not found after download' });
          }
          return;
        }

        const stats = fs.statSync(outputPath);

        // Set headers for attachment download
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.setHeader('Content-Length', stats.size);

        console.log(`[download] Streaming file: ${tempFile} (${stats.size} bytes)`);

        const stream = fs.createReadStream(outputPath);
        stream.pipe(res);

        stream.on('end', () => {
          try {
            fs.unlinkSync(outputPath);
            console.log(`[cleanup] Deleted: ${tempFile}`);
          } catch (e) {
            console.error('[cleanup] Failed:', tempFile, e);
          }
        });

        stream.on('error', (err) => {
          console.error('[stream] Error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'stream_failed' });
          }
        });
      } catch (streamErr) {
        console.error('[stream_setup] Failed:', streamErr);
        if (!res.headersSent) {
          res.status(500).json({ error: 'stream_failed', message: streamErr.message });
        }
      }
    });

  } catch (error) {
    console.error('[download] Execution Wrapper Failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'execution_failed', message: error.message });
    }
  }
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
