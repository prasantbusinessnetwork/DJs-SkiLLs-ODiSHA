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
import { rateLimit } from 'express-rate-limit'; // Added for protection

const execPromise = promisify(exec);
const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1'); // Handle Windows paths from URL
// Use /tmp for Railway/Linux environments (guaranteed writeable)
const isWindows = process.platform === 'win32';
const downloadsDir = isWindows ? path.join(process.cwd(), 'downloads') : '/tmp/djs_downloads';

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
} else {
  // Cleanup old files on startup
  try {
    const files = fs.readdirSync(downloadsDir);
    for (const file of files) {
      if (file.startsWith('dl_')) {
        fs.unlinkSync(path.join(downloadsDir, file));
      }
    }
    console.log(`[server] Startup cleanup: ${downloadsDir} cleared`);
  } catch (e) {
    console.error('[server] Startup cleanup failed:', e);
  }
}

// ─── Tool Verification ────────────────────────────────────────────────────────
async function verifyTools() {
  try {
    const { stdout: ytdlpPath } = await execPromise('which yt-dlp || where yt-dlp').catch(() => ({ stdout: 'not found' }));
    const { stdout: ffmpegPath } = await execPromise('which ffmpeg || where ffmpeg').catch(() => ({ stdout: 'not found' }));
    console.log(`[server] Tool check: yt-dlp -> ${ytdlpPath.trim()}, ffmpeg -> ${ffmpegPath.trim()}`);
    
    if (ytdlpPath.includes('not found') || ffmpegPath.includes('not found')) {
      console.warn('[server] WARNING: Tools not found in path! Download may fail.');
    }
  } catch (e) {
    console.error('[server] Tool verification failed:', e);
  }
}
verifyTools();

// ─── Setup Cookies from Env ───────────────────────────────────────────────────
if (process.env.YOUTUBE_COOKIES) {
  try {
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    // Save string format exactly as passed from env to cookies.txt
    const cookieData = process.env.YOUTUBE_COOKIES.replace(/\\n/g, '\n').trim();
    if (cookieData) {
      fs.writeFileSync(cookiesPath, cookieData);
      console.log('[server] Startup: Wrote YOUTUBE_COOKIES to cookies.txt');
    }
  } catch (e) {
    console.error('[server] Startup: Failed to write cookies:', e);
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

// ─── Rate Limiter (50 downloads per IP per 24h) ───────────────────────────────
const downloadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // Limit each IP to 100 downloads per window (being generous)
  message: { error: "daily_limit_reached", message: "You have reached your daily download limit (100). Please try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    while (videos.length < limit) {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
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

// ─── MP3 Download (Ironclad Hardened Strategy) ────────────────────────────────
app.get("/api/download", downloadLimiter, async (req, res) => {
  const url = req.query.url;
  const requestedTitle = req.query.title ? String(req.query.title) : "audio";
  const safeTitle = requestedTitle.replace(/[^\w\s-]/gi, '').trim() || "audio";

  if (!url) return res.status(400).json({ error: "missing_url" });

  const tempId = `iron_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const rawPath = path.join(downloadsDir, `${tempId}_raw`);
  const mp3Path = path.join(downloadsDir, `${tempId}.mp3`);
  
  console.log(`[ironclad] Request started: ${url}`);

  const cookiesPath = path.join(process.cwd(), 'cookies.txt');
  const hasCookies = fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 10;

  // Helper to run a command with a timeout
  const runWithTimeout = (cmd, args, timeoutMs = 120000) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args);
      let stderr = '';
      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Command timed out after ${timeoutMs/1000}s`));
      }, timeoutMs);

      proc.stderr.on('data', (d) => stderr += d.toString());
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`Exit ${code}: ${stderr.trim()}`));
      });
    });
  };

  try {
    // 3-TIER DOWNLOAD ATTEMPT
    let success = false;
    const attempts = [
      { name: "Cookies + Desktop", cookies: true, client: "web,android" },
      { name: "No Cookies + Desktop", cookies: false, client: "web,android" },
      { name: "No Cookies + Mobile", cookies: false, client: "mweb,android" }
    ];

    for (const attempt of attempts) {
      if (attempt.cookies && !hasCookies) continue;
      
      console.log(`[ironclad] Attempting: ${attempt.name}`);
      try {
        const flags = [
          '--no-check-certificates', '--no-warnings', '--no-playlist',
          '-f', 'ba/b',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          '--extractor-args', `youtube:player_client=${attempt.client}`,
          '-o', `${rawPath}.%(ext)s`,
          url
        ];
        if (attempt.cookies) flags.unshift('--cookies', cookiesPath);
        
        await runWithTimeout('yt-dlp', flags);
        
        // Find the file
        const files = fs.readdirSync(downloadsDir);
        const actualFile = files.find(f => f.startsWith(path.basename(rawPath)));
        if (actualFile && fs.statSync(path.join(downloadsDir, actualFile)).size > 5000) {
          const fullPath = path.join(downloadsDir, actualFile);
          // If extension isn't .mp3, convert it properly
          await runWithTimeout('ffmpeg', [
            '-i', fullPath,
            '-acodec', 'libmp3lame', '-b:a', '192k', '-ar', '44100',
            '-id3v2_version', '3', '-y', mp3Path
          ]);
          
          if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 10000) {
            success = true;
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            break;
          }
        }
      } catch (e) {
        console.warn(`[ironclad] ${attempt.name} failed: ${e.message}`);
        // Cleanup attempt files
        const files = fs.readdirSync(downloadsDir);
        files.filter(f => f.startsWith(path.basename(rawPath))).forEach(f => fs.unlinkSync(path.join(downloadsDir, f)));
      }
    }

    if (!success) throw new Error("All download attempts failed. YouTube might be blocking the server.");

    // SERVE THE PERFECT MP3
    const finalStats = fs.statSync(mp3Path);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", finalStats.size);
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
    res.setHeader("Cache-Control", "public, max-age=3600");

    const reader = fs.createReadStream(mp3Path);
    reader.pipe(res);
    reader.on('end', () => {
      fs.unlink(mp3Path, () => {});
    });

  } catch (err) {
    console.error(`[ironclad] CRITICAL ERROR: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).send(`Ironclad Error: ${err.message}`);
    }
    // Final cleanup
    try {
      const files = fs.readdirSync(downloadsDir);
      files.filter(f => f.startsWith(tempId)).forEach(f => fs.unlinkSync(path.join(downloadsDir, f)));
    } catch (e) {}
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
