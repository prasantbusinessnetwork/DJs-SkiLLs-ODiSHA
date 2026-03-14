/**
 * server.mjs — DJs SkiLLs ODiSHA Backend (Ironclad v4.0)
 * 
 * Major Fixes:
 * 1. bgutil-ytdlp-pot-provider: Automatic PO-Token bypass
 * 2. Concurrency Control: Max 3 downloads to prevent memory crashes
 * 3. 4-Tier Hardened Strategy: Cookies/No-Cookies + Multiple Clients
 * 4. Multi-Tier Proxy: Private Cobalt -> Public Cobalt -> Manual Fallbacks
 * 5. CORS Bridge: Serverside streaming of external files
 */

import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import { Readable } from 'stream';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { rateLimit } from 'express-rate-limit';

const execPromise = promisify(exec);
const isWindows = process.platform === 'win32';
const downloadsDir = isWindows ? path.join(process.cwd(), 'downloads') : '/tmp/djs_downloads';

// --- Concurrency Control ---
let activeDownloads = 0;
const MAX_CONCURRENT_DOWNLOADS = 3;

// Ensure downloads directory exists
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// --- Tool Verification & Startup Maintenance ---
async function startupMaintenance() {
  console.log('[server] Running startup maintenance...');
  try {
    // 1. Concurrent Cache Clear (move it to startup only)
    exec('yt-dlp --rm-cache-dir', (err) => {
      if (!err) console.log('[server] yt-dlp cache cleared.');
    });

    // 2. Non-blocking yt-dlp Update (30s timeout)
    const updateTimeout = 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), updateTimeout);
    
    exec('yt-dlp -U', { signal: controller.signal }, (err, stdout) => {
      clearTimeout(timer);
      if (err) console.warn('[server] yt-dlp update skipped or timed out:', err.message);
      else console.log('[server] yt-dlp self-update check complete.');
    });

    // 3. Initial Directory Cleanup
    const files = fs.readdirSync(downloadsDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(downloadsDir, file);
      const stats = fs.statSync(filePath);
      // Delete anything older than 1 hour on startup
      if (now - stats.mtimeMs > 3600000) {
        fs.unlinkSync(filePath);
      }
    }
    console.log('[server] Startup cleanup finished.');
  } catch (e) {
    console.error('[server] Startup maintenance error:', e.message);
  }
}
startupMaintenance();

// --- Scheduled Cleanup (Every 30 mins) ---
setInterval(() => {
  try {
    const files = fs.readdirSync(downloadsDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(downloadsDir, file);
      // Ignore if it's currently being written (simple check by age)
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 1800000) { // 30 mins
        fs.unlinkSync(filePath);
      }
    }
  } catch (e) {
    console.error('[server] Scheduled cleanup failed:', e);
  }
}, 1800000);

const app = express();
const PORT = process.env.PORT || 3000;

// --- CORS ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Disposition', 'Content-Length'],
}));

// --- Rate Limiter (100 downloads per IP per 24h) ---
const downloadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, 
  max: 100,
  message: { error: "daily_limit_reached", message: "Daily limit reached (100). Try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Health ---
app.get(['/health', '/api/health'], (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// --- ROOT ---
app.get('/', (_req, res) => res.send('DJs SkiLLs ODiSHA Backend (Ironclad v4.0) is Online'));

// ─── Videos (Dynamic YouTube API Fetch) ────────────────────────────
// Note: Keeping existing videoCache/fetch logic for stability
const videoCache = { data: null, lastFetched: 0, isFetching: false, TTL: 5 * 60 * 1000 };
const fallbackVideos = [
  { title: "Aaj Ki Raat (Remix)", artist: "DJs SkILLs ODISHA", tag: "Latest", youtubeUrl: "https://www.youtube.com/watch?v=KsJ2-7cWTyg", videoId: "KsJ2-7cWTyg", thumbnail: "https://img.youtube.com/vi/KsJ2-7cWTyg/mqdefault.jpg" },
];

async function fetchFullChannelVideos(apiKey, channelId, limit = 500) {
  let videos = [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.items.map(item => ({
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      tag: "Remix",
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
      publishedAt: item.snippet.publishedAt
    }));
  } catch (e) { return []; }
}

app.get('/api/latest', async (req, res) => {
  const API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  const now = Date.now();
  if (videoCache.data && (now - videoCache.lastFetched < videoCache.TTL)) return res.json(videoCache.data.slice(0, 5));
  fetchFullChannelVideos(API_KEY, CHANNEL_ID).then(v => { if (v.length) { videoCache.data = v; videoCache.lastFetched = now; } });
  res.json((videoCache.data || fallbackVideos).slice(0, 5));
});

app.get('/api/videos', async (req, res) => {
  const API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  if (videoCache.data && (Date.now() - videoCache.lastFetched < videoCache.TTL)) return res.json(videoCache.data);
  const v = await fetchFullChannelVideos(API_KEY, CHANNEL_ID);
  if (v.length) { videoCache.data = v; videoCache.lastFetched = Date.now(); }
  res.json(videoCache.data || fallbackVideos);
});

// --- Cookie Logic (Preserved) ---
const cookiesPath = path.join(process.cwd(), 'cookies.txt');
if (process.env.YOUTUBE_COOKIES) {
  try {
    let cookieData = process.env.YOUTUBE_COOKIES.replace(/\\n/g, '\n').trim();
    if (cookieData.includes('.youtube.com') && !cookieData.includes('\t')) cookieData = cookieData.replace(/ +/g, '\t');
    fs.writeFileSync(cookiesPath, cookieData);
  } catch (e) { console.error('[server] Cookie setup failed:', e.message); }
}

// --- Download Route ---
app.get("/api/download", downloadLimiter, async (req, res) => {
  const url = req.query.url;
  const requestedTitle = req.query.title ? String(req.query.title) : "audio";
  const safeTitle = requestedTitle.replace(/[^\w\s-]/gi, '').trim() || "audio";

  if (!url) return res.status(400).json({ error: "missing_url" });

  // 1. Concurrency Check
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    return res.status(429).json({ 
      error: "server_busy", 
      message: "Server is busy with other downloads. Please try again in 30 seconds.",
      retryAfter: 30 
    });
  }

  activeDownloads++;
  const tempId = `dl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const rawPath = path.join(downloadsDir, `${tempId}_raw`);
  const mp3Path = path.join(downloadsDir, `${tempId}.mp3`);
  
  const hasCookies = fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 10;

  const runWithTimeout = (cmd, args, timeoutMs) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args);
      let stderr = '';
      const timer = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('timeout')); }, timeoutMs);
      proc.stderr.on('data', (d) => stderr += d.toString());
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `Exit code ${code}`));
      });
    });
  };

  try {
    console.log(`[ironclad] Download Request: ${url} (Queue: ${activeDownloads}/${MAX_CONCURRENT_DOWNLOADS})`);

    // --- Hardened 4-Tier Strategy ---
    let success = false;
    const attempts = [
      { name: "Cookies+TV", cookies: true, client: "tv,web" },
      { name: "Cookies+iOS", cookies: true, client: "ios,web" },
      { name: "NoCookies+TV", cookies: false, client: "tv,web" },
      { name: "NoCookies+Embedded", cookies: false, client: "tv_embedded,web" }
    ];

    for (const attempt of attempts) {
      if (attempt.cookies && !hasCookies) continue;
      
      console.log(`[ironclad] Trying Tier: ${attempt.name}`);
      try {
        const flags = [
          '--no-check-certificates', '--no-warnings', '--no-playlist',
          '--add-header', 'Referer:https://www.youtube.com/',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          '-f', 'ba/b',
          '--extractor-args', `youtube:player_client=${attempt.client}`,
          '-o', `${rawPath}.%(ext)s`,
        ];

        if (attempt.cookies) flags.unshift('--cookies', cookiesPath);
        
        // Manual PO tokens ONLY if both are set
        if (process.env.YOUTUBE_PO_TOKEN && process.env.YOUTUBE_VISITOR_DATA) {
          flags.push('--extractor-args', `youtube:po_token=${process.env.YOUTUBE_PO_TOKEN};youtube:visitor_data=${process.env.YOUTUBE_VISITOR_DATA}`);
        }

        flags.push(url.trim());

        await runWithTimeout('yt-dlp', flags, 60000); // 60s timeout per tier
        
        const files = fs.readdirSync(downloadsDir);
        const actualFile = files.find(f => f.startsWith(path.basename(rawPath)));
        if (actualFile) {
          const fullPath = path.join(downloadsDir, actualFile);
          await runWithTimeout('ffmpeg', [
            '-i', fullPath, '-acodec', 'libmp3lame', '-b:a', '192k', '-ar', '44100', '-y', mp3Path
          ], 40000);
          
          if (fs.existsSync(mp3Path)) {
            success = true;
            fs.unlink(fullPath, () => {});
            break;
          }
        }
      } catch (e) {
        console.warn(`[ironclad] Tier ${attempt.name} failed: ${e.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // --- Proxy/Redirection Safety Net ---
    if (!success) {
      console.log('[ironclad] Local tiers failed. Falling back to Proxy tiers...');
      const videoId = url.match(/(?:v=|\/embed\/|shorts\/|youtu\.be\/)([^&?/]+)/)?.[1] || url;
      
      const cobaltInstances = [];
      if (process.env.COBALT_INSTANCE_URL) cobaltInstances.push(process.env.COBALT_INSTANCE_URL);
      cobaltInstances.push("https://co.wuk.sh", "https://cobalt.katze.moe", "https://cobalt.ari.lt", "https://cobalt.tools");

      for (const instance of cobaltInstances) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const cobUrl = `${instance.replace(/\/$/, '')}/api/json`;
          
          const cobRes = await fetch(cobUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, isAudioOnly: true, aFormat: "mp3", filenameStyle: "pretty" }),
            signal: controller.signal
          });
          clearTimeout(timer);

          if (cobRes.ok) {
            const data = await cobRes.json();
            const dlLink = data.url || data?.data?.url;
            if (dlLink) {
              console.log(`[ironclad] Proxying stream from: ${instance}`);
              const streamRes = await fetch(dlLink);
              if (streamRes.ok) {
                res.setHeader("Content-Type", "audio/mpeg");
                res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
                const nodeStream = Readable.fromWeb(streamRes.body);
                return nodeStream.pipe(res);
              }
            }
          }
        } catch (e) { console.warn(`[ironclad] Proxy ${instance} failed: ${e.message}`); }
      }

      // --- Universal Last Resort Fallbacks (HEAD checks) ---
      const finalFallbacks = [
        { name: "yt-download", url: `https://api.yt-download.org/v1/button/mp3/${videoId}` },
        { name: "loader.to", url: `https://loader.to/api/button/?url=${videoId}&f=mp3` }
      ];
      for (const f of finalFallbacks) {
        try {
          const check = await fetch(f.url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
          if (check.ok) return res.redirect(f.url);
        } catch(e) {}
      }

      return res.redirect(`https://savefrom.net/?url=https://www.youtube.com/watch?v=${videoId}`);
    }

    // --- Serve Perfect MP3 ---
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.mp3"`);
    const reader = fs.createReadStream(mp3Path);
    reader.pipe(res);
    reader.on('end', () => {
      fs.unlink(mp3Path, () => {});
    });

  } catch (err) {
    console.error(`[ironclad] CRITICAL: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ error: "failed", message: err.message });
  } finally {
    activeDownloads--;
  }
});

app.get('/api/debug-download', async (req, res) => {
  try {
    const hasCookies = fs.existsSync(cookiesPath) ? `${fs.statSync(cookiesPath).size} bytes` : 'Not Found';
    const { stdout: pipOut } = await execPromise('pip list | grep bgutil || echo "Not Installed"');
    const { stdout: toolsOut } = await execPromise('yt-dlp --version && ffmpeg -version | head -n 1');
    const { stdout: diskOut } = await execPromise('df -h /tmp | tail -n 1');
    
    res.setHeader('Content-Type', 'text/plain');
    res.write(`Ironclad Debug Info\n`);
    res.write(`-------------------\n`);
    res.write(`Queue: ${activeDownloads}/${MAX_CONCURRENT_DOWNLOADS}\n`);
    res.write(`CWD: ${process.cwd()}\n`);
    res.write(`Cookies: ${hasCookies}\n`);
    res.write(`bgutil: ${pipOut.trim()}\n`);
    res.write(`Disk /tmp: ${diskOut.trim()}\n`);
    res.write(`Tools:\n${toolsOut.trim()}\n`);
    res.end();
  } catch (e) {
    res.status(500).send(`Debug Error: ${e.message}`);
  }
});

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(PORT, '0.0.0.0', () => console.log(`[server] Ironclad v4.0 Listening on port ${PORT}`));

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
