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

// ─── Download ─────────────────────────────────────────────────────────────────
app.get(['/download', '/api/download'], (req, res) => {
  const raw = req.query.url || req.query.v || '';
  const titleParam = req.query.title ? String(req.query.title).replace(/[^\w\s\-]/g, '_') : 'audio';

  if (!raw) {
    return res.status(400).json({ error: 'missing_url' });
  }

  // ── Build a full YouTube URL regardless of what the frontend sends ───────
  // Frontend sends either: a bare video ID (e.g. "dQw4w9WgXcQ")
  //                     or: a full URL (e.g. "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
  let videoUrl;
  try {
    const parsed = new URL(raw); // throws if not a valid URL
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      videoUrl = raw;
    } else {
      return res.status(400).json({ error: 'invalid_url' });
    }
  } catch {
    // Not a URL — treat as a bare video ID
    if (/^[a-zA-Z0-9_\-]{7,15}$/.test(raw)) {
      videoUrl = `https://www.youtube.com/watch?v=${raw}`;
    } else {
      return res.status(400).json({ error: 'invalid_video_id' });
    }
  }

  const filename = `${titleParam}.mp3`;
  console.log(`[download] Streaming: ${videoUrl} -> "${filename}"`);

  // ── Spawn yt-dlp ──────────────────────────────────────────────────────────
  const ytdlp = spawn('yt-dlp', [
    '--no-playlist',
    '--no-check-certificate',
    '--extractor-args', 'youtube:player_client=android,ios',
    '--format', 'bestaudio[ext=m4a]/bestaudio/best', // Prefer m4a for better ffmpeg compatibility in pipes
    '-o', '-',           // stream to stdout
    videoUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  // ── Spawn ffmpeg ───────────────────────────────────────────────────────────
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', 'pipe:0',      // read from stdin
    '-vn',               // no video
    '-acodec', 'libmp3lame',
    '-ar', '44100',      // sample rate
    '-ac', '2',          // stereo
    '-b:a', '192k',      // higher CBR for better compatibility
    '-id3v2_version', '3',
    '-f', 'mp3',
    'pipe:1',            // write to stdout
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  // ── Wire the pipeline ──────────────────────────────────────────────────────
  ytdlp.stdout.pipe(ffmpeg.stdin);

  // ── Set HTTP headers BEFORE piping ────────────────────────────────────────
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  ffmpeg.stdout.pipe(res);

  // ── Logging ───────────────────────────────────────────────────────────────
  let ytdlpError = '';
  ytdlp.stderr.on('data', (d) => {
    const msg = d.toString();
    ytdlpError += msg;
    console.error('[yt-dlp]', msg);
  });
  ffmpeg.stderr.on('data', (d) => console.error('[ffmpeg]', d.toString()));

  // ── Cleanup helper ────────────────────────────────────────────────────────
  let cleanedUp = false;
  function cleanup(label) {
    if (cleanedUp) return;
    cleanedUp = true;
    console.log(`[cleanup] ${label}`);
    try { ytdlp.kill('SIGKILL'); } catch (_) {}
    try { ffmpeg.kill('SIGKILL'); } catch (_) {}
  }

  // ── Client disconnected mid-stream ────────────────────────────────────────
  req.on('close', () => cleanup('client_disconnected'));

  // ── Safety timeout: 8 minutes ─────────────────────────────────────────────
  const timer = setTimeout(() => {
    console.error('[timeout] Killing processes after 8 min');
    cleanup('timeout');
    if (!res.headersSent) {
      res.status(504).json({ error: 'timeout' });
    } else {
      res.end();
    }
  }, 8 * 60 * 1000);

  // ── yt-dlp exit ───────────────────────────────────────────────────────────
  ytdlp.on('close', (code) => {
    console.log(`[yt-dlp] exited code=${code}`);
    if (code !== 0) {
      // Signal end to ffmpeg so it flushes what it has
      try { ffmpeg.stdin.end(); } catch (_) {}
    }
  });

  // ── yt-dlp spawn error (binary not found) ─────────────────────────────────
  ytdlp.on('error', (e) => {
    console.error('[yt-dlp spawn]', e.message);
    cleanup('ytdlp_spawn_error');
    clearTimeout(timer);
    if (!res.headersSent) {
      res.status(500).json({ error: 'yt_dlp_not_found', message: e.message });
    } else {
      res.end();
    }
  });

  // ── ffmpeg spawn error ────────────────────────────────────────────────────
  ffmpeg.on('error', (e) => {
    console.error('[ffmpeg spawn]', e.message);
    cleanup('ffmpeg_spawn_error');
    clearTimeout(timer);
    if (!res.headersSent) {
      res.status(500).json({ error: 'ffmpeg_not_found', message: e.message });
    } else {
      res.end();
    }
  });

  // ── ffmpeg done ───────────────────────────────────────────────────────────
  ffmpeg.on('close', (code) => {
    clearTimeout(timer);
    console.log(`[ffmpeg] exited code=${code}`);
    cleanup('ffmpeg_done');
    if (!res.writableEnded) res.end();
  });
});

// ─── Direct MP3 Download (High Compatibility) ──────────────────────────────
app.get('/api/download-mp3', async (req, res) => {
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
      '--embed-metadata', // Safe to keep metadata
      // REMOVED --embed-thumbnail as it can corrupt MP3 headers on some players/OSs
      '--no-playlist', '--no-check-certificate',
      '--extractor-args', 'youtube:player_client=android,ios',
      '-o', outputPath,
      videoUrl
    ];

    console.log(`[download-mp3] Spawning yt-dlp for conversion...`);
    
    const ytdlpProc = spawn('yt-dlp', args);

    // Collect stderr for logging/errors
    let stderrData = '';
    ytdlpProc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    await new Promise((resolve, reject) => {
      ytdlpProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp failed with code ${code}: ${stderrData}`));
      });
      ytdlpProc.on('error', reject);
    });

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
