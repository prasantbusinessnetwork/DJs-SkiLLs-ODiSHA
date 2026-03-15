/**
 * server.mjs — DJs SkiLLs ODiSHA Backend (Ironclad v7.3 FIX)
 *
 * Major Fixes in v7.2:
 * 1. Expanded Try-Loops: 4 tiers (TV, iOS, Web combined).
 * 2. Format Fix: Changed 'bestaudio/best' to 'ba/b' for universal compatibility.
 * 3. Timeout Buff: Increased yt-dlp timeout to 60s.
 * 4. bgutil server: Robust check for generate_once.js in debug.
 * 5. Fallback Update: India-friendly redirects (y2mate/yt1s/loader.to).
 */

import express from 'express';
import cors from 'cors';
import { spawn, exec, execSync } from 'child_process';
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

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

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

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Disposition', 'Content-Length'],
}));

const downloadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 100,
  message: { error: "daily_limit_reached", message: "Daily limit reached. Try tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get(['/health', '/api/health'], (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.get('/', (_req, res) => res.send('DJs SkiLLs ODiSHA Backend (Ironclad v7.3) is Online ✅'));

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

async function tryCobaltInstance(instance, videoId, res) {
  const cobaltUrl = `${instance.replace(/\/$/, '')}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const cobRes = await fetch(cobaltUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ 
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true,
        aFormat: "mp3",
        filenameStyle: "pretty"
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!cobRes.ok) return false;
    const data = await cobRes.json();
    const dlLink = data.url || data?.data?.url;
    if (!dlLink) return false;
    console.log(`[cobalt] Sending direct link for frontend to open: ${dlLink.slice(0, 50)}...`);
    res.json({ redirect: dlLink, message: 'Redirecting to direct download link' });
    return true;
  } catch (e) { clearTimeout(timer); return false; }
}

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
    
    // Tiered attempts (CHANGE C)
    const attempts = [];
    if (hasCookies) {
      attempts.push({ name: 'Cookies+TV+Web', cookies: true, client: 'tv,web' });
      attempts.push({ name: 'Cookies+iOS+Web', cookies: true, client: 'ios,web' });
    }
    attempts.push({ name: 'NoCookies+TV+Web', cookies: false, client: 'tv,web' });
    attempts.push({ name: 'NoCookies+TVembedded+Web', cookies: false, client: 'tv_embedded,web' });

    let success = false;
    for (const attempt of attempts) {
      try {
        const flags = [
          '--no-check-certificates', '--no-warnings', '--no-playlist',
          '--add-header', 'Referer:https://www.youtube.com/',
          '-f', 'ba/b', // CHANGE A
          '--extractor-args', `youtube:player_client=${attempt.client}`,
          '-o', `${rawPath}.%(ext)s`,
        ];
        if (attempt.cookies) flags.unshift('--cookies', cookiesPath);
        if (PO_TOKEN && VISITOR_DATA) {
          flags.push('--extractor-args', `youtube:po_token=web+${PO_TOKEN}`, '--extractor-args', `youtube:visitor_data=${VISITOR_DATA}`);
        }
        flags.push(url.trim());

        await runWithTimeout('yt-dlp', flags, 60000); // CHANGE B (60s timeout)
        const actualFile = fs.readdirSync(downloadsDir).find(f => f.startsWith(path.basename(rawPath)));
        if (!actualFile) throw new Error('File not found');

        const fullPath = path.join(downloadsDir, actualFile);
        await runWithTimeout('ffmpeg', ['-i', fullPath, '-vn', '-acodec', 'libmp3lame', '-b:a', '192k', '-y', mp3Path], 60000);
        fs.unlink(fullPath, () => {});

        if (fs.existsSync(mp3Path)) { success = true; break; }
      } catch (e) { console.warn(`[ironclad] Attempt ${attempt.name} failed: ${e.message}`); }
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
    const cobaltInstances = [
      process.env.COBALT_INSTANCE_URL,
      'https://co.wuk.sh',
      'https://cobalt.katze.moe',
      'https://cobalt.ari.lt',
      'https://cob.in.projectsegfau.lt'
    ].filter(Boolean);
    for (const instance of cobaltInstances) {
      if (await tryCobaltInstance(instance, videoId, res)) return;
    }

    // CHANGE D: India Optimized Fallbacks
    return res.json({ 
      error: 'fallback',
      redirect: `https://y2mate.com/youtube-mp3/${videoId}`,
      message: 'Redirecting to download...'
    });
  } catch (err) {
    console.error(`[ironclad] Error: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ error: 'failed' });
  } finally { activeDownloads--; }
});

app.get('/api/test-ytdlp', async (req, res) => {
  const testUrl = req.query.url || 'https://www.youtube.com/watch?v=KsJ2-7cWTyg';
  const client = req.query.client || 'tv,web';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(`yt-dlp Diagnostic Test (v7.3)\n`);
  res.write(`URL: ${testUrl}\n`);
  res.write(`Client: ${client}\n`);
  res.write(`Cookies: ${fs.existsSync(cookiesPath) ? 'FOUND' : 'NOT FOUND'}\n\n`);

  const flags = [
    '--no-check-certificates', '--no-warnings', '--no-playlist',
    '--add-header', 'Referer:https://www.youtube.com/',
    '-f', 'ba/b', // CHANGE A
    '--extractor-args', `youtube:player_client=${client}`,
    '-v', '--simulate', '--print', 'filename', testUrl
  ];
  if (fs.existsSync(cookiesPath)) flags.unshift('--cookies', cookiesPath);

  const proc = spawn('yt-dlp', flags);
  proc.stdout.on('data', (d) => res.write(`[OUT] ${d}`));
  proc.stderr.on('data', (d) => res.write(`[ERR] ${d}`));
  proc.on('close', (code) => { res.write(`\nExited with Code ${code}`); res.end(); });
});

app.get('/api/debug-download', async (req, res) => {
  try {
    const cookieFileExists = fs.existsSync(cookiesPath);
    const cookieFileSize = cookieFileExists ? fs.statSync(cookiesPath).size : 0;
    
    const envKeys = [
      'PORT', 'YOUTUBE_API_KEY', 'YOUTUBE_CHANNEL_ID',
      'YOUTUBE_COOKIES', 'YOUTUBE_PO_TOKEN', 'YOUTUBE_VISITOR_DATA', 'COBALT_INSTANCE_URL'
    ];

    const envStatus = envKeys.map(k => {
      const exact = process.env[k];
      const withSpace = process.env[k + ' '];
      const val = exact || withSpace;
      const status = val?.trim() ? `✅ Set (${String(val).trim().length} chars)` : '❌ Missing';
      const warning = (!exact && withSpace) ? ' (⚠️ SPACE DETECTED IN KEY NAME)' : '';
      return `  ${k}: ${status}${warning}`;
    }).join('\n');

    const { stdout: ytVer } = await execPromise('yt-dlp --version').catch(e => ({ stdout: e.message }));
    
    // CHANGE E: bgutil server check
    let bgutilLog = '❌ NOT FOUND';
    try {
      const manualPaths = [
        path.join(process.cwd(), 'bgutil-server-src', 'server', 'build', 'generate_once.js'),
        '/app/bgutil-server-src/server/build/generate_once.js',
        '/root/bgutil-server-src/build/generate_once.js'
      ];
      for (const p of manualPaths) {
        if (fs.existsSync(p)) { bgutilLog = `✅ FOUND (${p})`; break; }
      }
      if (bgutilLog === '❌ NOT FOUND') {
        // Fallback to python detection
        const bgutilPath = execSync(
          "python3 -c \"import bgutil_ytdlp_pot_provider,os; print(os.path.join(os.path.dirname(bgutil_ytdlp_pot_provider.__file__),'server','build','generate_once.js'))\"",
          { encoding: 'utf8', timeout: 5000 }
        ).trim();
        if (fs.existsSync(bgutilPath)) bgutilLog = `✅ FOUND (${bgutilPath})`;
      }
    } catch(e) { bgutilLog = `❌ ERROR: ${e.message}`; }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write(`=== Ironclad v7.3 Debug ===\n`);
    res.write(`Timestamp: ${new Date().toISOString()}\n\n`);
    res.write(`--- Cookies ---\n`);
    res.write(`  Path: ${cookiesPath}\n`);
    res.write(`  Status: ${cookieFileExists ? '✅ FOUND' : '❌ NOT FOUND'}\n`);
    res.write(`  File Size: ${cookieFileSize} bytes\n\n`);
    res.write(`--- Environment ---\n`);
    res.write(envStatus + '\n\n');
    res.write(`--- Tools ---\n`);
    res.write(`  yt-dlp: ${ytVer.trim()}\n`);
    res.write(`  bgutil-server: ${bgutilLog}\n`);
    res.end();
  } catch (err) {
    res.status(500).send('Debug error: ' + err.message);
  }
});

app.get('/api/inspect-fs', async (req, res) => {
  const cmd = req.query.cmd || 'ls -la .';
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  try {
    const { stdout, stderr } = await execPromise(cmd).catch(e => ({ stdout: e.message, stderr: '' }));
    res.write(`Command: ${cmd}\n\n`);
    res.write(stdout);
    if (stderr) res.write(`\nERR: ${stderr}`);
    res.end();
  } catch (err) {
    res.status(500).send('Inspect error: ' + err.message);
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`[server] Ironclad v7.3 Listening on port ${PORT}`));
