/**
 * server.mjs — DJs SkiLLs ODiSHA Backend (Ironclad v5.5 FIX)
 *
 * Major Fixes in v5.5:
 * 1. Cobalt v10 REDIRECT: Bypass Railway IP blocks by letting browser download directly.
 * 2. Robust Cookies: Handles trailing spaces (env 'YOUTUBE_COOKIES ').
 * 3. Fallback logic: yt-dlp (local) -> Cobalt (redirect) -> SaveFrom (redirect).
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
    exec('yt-dlp --rm-cache-dir', (err) => {
      if (!err) console.log('[server] yt-dlp cache cleared.');
    });

    const updateTimeout = 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), updateTimeout);

    exec('yt-dlp -U', { signal: controller.signal }, (err, stdout) => {
      clearTimeout(timer);
      if (err) console.warn('[server] yt-dlp update skipped or timed out:', err.message);
      else console.log('[server] yt-dlp self-update check complete.');
    });

    const files = fs.readdirSync(downloadsDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(downloadsDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 3600000) fs.unlinkSync(filePath);
      } catch (_) {}
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
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 1800000) fs.unlinkSync(filePath);
      } catch (_) {}
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
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Disposition', 'Content-Length'],
}));

// --- Rate Limiter ---
const downloadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  message: { error: "daily_limit_reached", message: "Daily limit reached. Try tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Health ---
app.get(['/health', '/api/health'], (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// --- ROOT ---
app.get('/', (_req, res) => res.send('DJs SkiLLs ODiSHA Backend (Ironclad v5.5) is Online ✅'));

// ─── Videos (Dynamic YouTube API Fetch) ────────────────────────────
const videoCache = { data: null, lastFetched: 0, TTL: 5 * 60 * 1000 };
const fallbackVideos = [
  { title: "Aaj Ki Raat (Remix)", artist: "DJs SkILLs ODISHA", tag: "Latest", youtubeUrl: "https://www.youtube.com/watch?v=KsJ2-7cWTyg", videoId: "KsJ2-7cWTyg", thumbnail: "https://img.youtube.com/vi/KsJ2-7cWTyg/mqdefault.jpg" },
];

async function fetchFullChannelVideos(apiKey, channelId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.items) return [];
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
  const API_KEY = process.env.YOUTUBE_API_KEY || process.env['YOUTUBE_API_KEY '] || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || process.env['YOUTUBE_CHANNEL_ID '] || "UC8FEwv0WXF5db-pIs8uJkag";
  const now = Date.now();
  if (videoCache.data && (now - videoCache.lastFetched < videoCache.TTL)) return res.json(videoCache.data.slice(0, 5));
  fetchFullChannelVideos(API_KEY, CHANNEL_ID).then(v => { if (v.length) { videoCache.data = v; videoCache.lastFetched = now; } });
  res.json((videoCache.data || fallbackVideos).slice(0, 5));
});

app.get('/api/videos', async (req, res) => {
  const API_KEY = process.env.YOUTUBE_API_KEY || process.env['YOUTUBE_API_KEY '] || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || process.env['YOUTUBE_CHANNEL_ID '] || "UC8FEwv0WXF5db-pIs8uJkag";
  if (videoCache.data && (Date.now() - videoCache.lastFetched < videoCache.TTL)) return res.json(videoCache.data);
  const v = await fetchFullChannelVideos(API_KEY, CHANNEL_ID);
  if (v.length) { videoCache.data = v; videoCache.lastFetched = Date.now(); }
  res.json(videoCache.data || fallbackVideos);
});

const cookiesPath = path.join(os.tmpdir(), 'yt_cookies.txt');

async function setupCookies() {
  let rawCookies = process.env.YOUTUBE_COOKIES || process.env['YOUTUBE_COOKIES '] || process.env['YOUTUBE_COOKIES  '];
  if (!rawCookies || rawCookies.trim().length === 0) return;
  try {
    let cookieData = rawCookies.replace(/\\n/g, '\n').replace(/\\t/g, '\t').trim();
    if (!cookieData.startsWith('# Netscape')) cookieData = '# Netscape HTTP Cookie File\n' + cookieData;
    fs.writeFileSync(cookiesPath, cookieData, { encoding: 'utf8', mode: 0o644 });
    console.log(`[cookies] ✅ Configured: ${cookieData.length} chars`);
  } catch (e) { console.error('[cookies] ❌ Write failed:', e.message); }
}
setupCookies();

const runWithTimeout = (cmd, args, timeoutMs) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stderr = '';
    const timer = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('timeout')); }, timeoutMs);
    proc.stderr.on('data', (d) => stderr += d.toString());
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `Exit ${code}`));
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
};

// --- Helper: Try Cobalt instance (v10 API) ---
async function tryCobaltInstance(instance, videoId, res) {
  const cobaltUrl = `${instance.replace(/\/$/, '')}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const cobRes = await fetch(cobaltUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, downloadMode: 'audio', audioFormat: 'mp3' }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!cobRes.ok) return false;
    const data = await cobRes.json();
    const dlLink = data.url || data?.data?.url;
    if (!dlLink) return false;
    console.log(`[cobalt] Redirecting to: ${dlLink.slice(0, 50)}...`);
    res.redirect(dlLink);
    return true;
  } catch (e) { clearTimeout(timer); return false; }
}

// --- Download Route ---
app.get('/api/download', downloadLimiter, async (req, res) => {
  const url = req.query.url;
  const requestedTitle = req.query.title ? String(req.query.title) : 'audio';
  const safeTitle = requestedTitle.replace(/[^\w\s-]/gi, '').trim() || 'audio';
  if (!url) return res.status(400).json({ error: 'missing_url' });

  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) return res.status(429).json({ error: 'server_busy', message: 'Busy. Try in 30s.' });

  activeDownloads++;
  const tempId = `dl_${Date.now()}`;
  const rawPath = path.join(downloadsDir, `${tempId}_raw`);
  const mp3Path = path.join(downloadsDir, `${tempId}.mp3`);
  const hasCookies = fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 10;
  const PO_TOKEN = (process.env.YOUTUBE_PO_TOKEN || process.env['YOUTUBE_PO_TOKEN '] || '').trim();
  const VISITOR_DATA = (process.env.YOUTUBE_VISITOR_DATA || process.env['YOUTUBE_VISITOR_DATA '] || '').trim();

  try {
    console.log(`[ironclad] Request URL: ${url}`);
    
    // Attempt yt-dlp first
    const attempts = [];
    if (hasCookies) {
      attempts.push({ name: 'Cookies+Web', cookies: true, client: 'web' });
      attempts.push({ name: 'Cookies+iOS', cookies: true, client: 'ios' });
    }
    attempts.push({ name: 'NoCookies+TV', cookies: false, client: 'tv' });

    let success = false;
    for (const attempt of attempts) {
      try {
        const flags = [
          '--no-check-certificates', '--no-warnings', '--no-playlist',
          '--add-header', 'Referer:https://www.youtube.com/',
          '-f', 'bestaudio/best',
          '--extractor-args', `youtube:player_client=${attempt.client}`,
          '-o', `${rawPath}.%(ext)s`,
        ];
        if (attempt.cookies) flags.unshift('--cookies', cookiesPath);
        if (PO_TOKEN && VISITOR_DATA) {
          flags.push('--extractor-args', `youtube:po_token=web+${PO_TOKEN}`, '--extractor-args', `youtube:visitor_data=${VISITOR_DATA}`);
        }
        flags.push(url.trim());

        await runWithTimeout('yt-dlp', flags, 35000);
        const actualFile = fs.readdirSync(downloadsDir).find(f => f.startsWith(path.basename(rawPath)));
        if (!actualFile) throw new Error('File not found');

        const fullPath = path.join(downloadsDir, actualFile);
        await runWithTimeout('ffmpeg', ['-i', fullPath, '-vn', '-acodec', 'libmp3lame', '-b:a', '192k', '-y', mp3Path], 60000);
        fs.unlink(fullPath, () => {});

        if (fs.existsSync(mp3Path)) { success = true; break; }
      } catch (e) { console.warn(`[ironclad] Attempt ${attempt.name} failed`); }
    }

    if (success) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
      const reader = fs.createReadStream(mp3Path);
      reader.pipe(res);
      reader.on('end', () => fs.unlink(mp3Path, () => {}));
      return;
    }

    // Fallback Cobalt
    const videoId = url.match(/(?:v=|\/embed\/|shorts\/|youtu\.be\/)([^&?/]+)/)?.[1] || url;
    const cobaltInstances = [process.env.COBALT_INSTANCE_URL, 'https://cobalt.tools', 'https://cobalt.ari.lt', 'https://cobalt.synzr.space'].filter(Boolean);
    for (const instance of cobaltInstances) {
      if (await tryCobaltInstance(instance, videoId, res)) return;
    }

    return res.redirect(`https://savefrom.net/?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}`);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: 'failed' });
  } finally { activeDownloads--; }
});

app.get('/api/test-ytdlp', async (req, res) => {
  const testUrl = req.query.url || 'https://www.youtube.com/watch?v=KsJ2-7cWTyg';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const flags = ['--cookies', cookiesPath, '-f', 'bestaudio/best', '-v', '--simulate', '--print', 'filename', testUrl];
  const proc = spawn('yt-dlp', flags);
  proc.stdout.on('data', (d) => res.write(`[OUT] ${d}`));
  proc.stderr.on('data', (d) => res.write(`[ERR] ${d}`));
  proc.on('close', (code) => { res.write(`\nCode ${code}`); res.end(); });
});

app.get('/api/debug-download', async (req, res) => {
  const exact = process.env.YOUTUBE_COOKIES;
  const withSpace = process.env['YOUTUBE_COOKIES '];
  const val = exact || withSpace;
  res.setHeader('Content-Type', 'text/plain');
  res.write(`Ironclad v5.5 Debug\n`);
  res.write(`Cookies: ${val ? '✅ Set ' + (exact ? '(Exact)' : '(Space)') : '❌ Missing'}\n`);
  res.write(`Tools: ` + (await execPromise('yt-dlp --version').then(r => r.stdout).catch(e => e.message)));
  res.end();
});

app.listen(PORT, '0.0.0.0', () => console.log(`[server] Ironclad v5.5 Listening on port ${PORT}`));
