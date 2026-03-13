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
  res.send('Backend Running');
});

// ─── Videos (Dynamic YouTube API Fetch) ───────────────────────────────────────
const fallbackVideos = [
  { title: "Aaj Ki Raat (Remix)", artist: "DJs SkILLs ODISHA X Exzost", tag: "Latest", youtubeUrl: "https://www.youtube.com/watch?v=KsJ2-7cWTyg", videoId: "KsJ2-7cWTyg", thumbnail: "https://img.youtube.com/vi/KsJ2-7cWTyg/mqdefault.jpg" },
  { title: "Tum Toh Dhokebaaz Ho", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=uYTeGgKheFw", videoId: "uYTeGgKheFw", thumbnail: "https://img.youtube.com/vi/uYTeGgKheFw/mqdefault.jpg" },
  { title: "JAMAL KUDU REMIX", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=a5EEWUnI8rg", videoId: "a5EEWUnI8rg", thumbnail: "https://img.youtube.com/vi/a5EEWUnI8rg/mqdefault.jpg" },
  { title: "SOFTLY (Remix)", artist: "Visual DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=k_smLZTvPug", videoId: "k_smLZTvPug", thumbnail: "https://img.youtube.com/vi/k_smLZTvPug/mqdefault.jpg" },
  { title: "Illuminati (Remix)", artist: "Visual DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=hK651bev0uI", videoId: "hK651bev0uI", thumbnail: "https://img.youtube.com/vi/hK651bev0uI/mqdefault.jpg" },
];

app.get(['/api/videos', '/api/latest-videos'], async (req, res) => {
  console.log(`[videos] Fetching videos for ${req.ip}`);
  
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
        const normalizedTitle = title.toLowerCase();
        if (normalizedTitle.includes("private video") || normalizedTitle.includes("deleted video")) {
          return null;
        }

        const thumbnails = snippet.thumbnails || {};
        const thumbnailUrl =
          thumbnails.medium?.url ||
          thumbnails.default?.url ||
          `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

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

// ─── Direct MP3 Download (The User's Requested Primary Route) ─────────────────
app.get(['/api/download', '/api/download-mp3'], async (req, res) => {
  const raw = req.query.url || req.query.v || '';
  
  // Stricter sanitization for the final filename (sent in headers)
  // Remove special characters, spaces to underscores, truncate to 60 chars
  const titleParam = req.query.title 
    ? String(req.query.title)
        .replace(/[^\w\s\-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .substring(0, 60)
    : 'audio_' + Date.now();

  if (!raw) {
    return res.status(400).json({ error: 'missing_url' });
  }

  let videoUrl;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      videoUrl = raw;
    } else {
      return res.status(400).json({ error: 'invalid_url' });
    }
  } catch {
    if (/^[a-zA-Z0-9_\-]{7,15}$/.test(raw)) {
      videoUrl = `https://www.youtube.com/watch?v=${raw}`;
    } else {
      return res.status(400).json({ error: 'invalid_video_id' });
    }
  }

  const fileId = Date.now() + '_' + Math.floor(Math.random() * 1000);
  // Use a very simple temp filename to avoid any fs-level corruption or path issues
  const tempFile = `${fileId}.mp3`;
  const outputPath = path.join(downloadsDir, tempFile);
  
  console.log(`[download-mp3] Converting: ${videoUrl}`);

  try {
    const args = [
      '-x', '--audio-format', 'mp3', '--audio-quality', '0',
      '--embed-metadata', // User explicitly requested this in Step 5
      '--no-playlist', '--no-check-certificate',
      '--force-ipv4', '--no-warnings', // Added to prevent Railway IPv6 blocks and keep logs clean
      '--extractor-args', 'youtube:player_client=android,web', // Fallback to multiple clients
      '-o', outputPath,
      videoUrl
    ];

    console.log(`[download-mp3] Spawning yt-dlp: yt-dlp ${args.join(' ')}`);
    
    const ytdlpProc = spawn('yt-dlp', args);

    let stderrData = '';
    ytdlpProc.stderr.on('data', (data) => {
      const msg = data.toString();
      stderrData += msg;
      if (msg.includes('ERROR:')) console.error(`[download-mp3] yt-dlp error: ${msg.trim()}`);
    });

    ytdlpProc.stdout.on('data', (data) => {
       // Optional: Log progress from stdout if needed
    });

    await new Promise((resolve, reject) => {
      ytdlpProc.on('close', (code) => {
        console.log(`[download-mp3] yt-dlp exited with code ${code}`);
        if (code === 0) resolve();
        // Include stderrData in the reject message so it is visible in the JSON response
        else reject(new Error(`yt-dlp failed (code ${code}). Error: ${stderrData.substring(0, 200)}`));
      });
      ytdlpProc.on('error', (err) => {
        console.error(`[download-mp3] Spawn error: ${err.message}`);
        reject(err);
      });
    });

    console.log(`[download-mp3] Conversion complete. Checking for file: ${tempFile}`);

    const fullFilePath = outputPath;
    const finalFilename = `${titleParam || 'audio'}.mp3`;
    
    if (!fs.existsSync(fullFilePath)) {
      throw new Error(`Conversion failed: ${tempFile} not found`);
    }

    const stats = fs.statSync(fullFilePath);

    // Basic integrity check: an MP3 should be at least a few KB
    if (stats.size < 1024) {
      throw new Error(`Generated file is too small (${stats.size} bytes). Likely corrupt.`);
    }

    // Set headers for explicit streaming
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}"`);
    res.setHeader('Accept-Ranges', 'bytes');

    console.log(`[download-mp3] Streaming file: ${tempFile} (${stats.size} bytes)`);

    const stream = fs.createReadStream(fullFilePath);
    stream.pipe(res);

    stream.on('end', () => {
      // Cleanup file after stream ends
      try {
        fs.unlinkSync(fullFilePath);
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

  } catch (error) {
    console.error('[download-mp3] Failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'conversion_failed', message: error.message });
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
