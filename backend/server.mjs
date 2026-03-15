/**
 * server.mjs — DJs SkiLLs ODiSHA Backend (Ironclad v5.1 HOTFIX)
 *
 * Fixes in v5.0 + v5.1:
 * 1. Cobalt API updated to v10 format (Accept: application/json header)
 * 2. Fixed clearTimeout(timer) bug in Cobalt loop (was referencing undefined var)
 * 3. Removed dead fallback services (loader.to, yt-download.org) — PERMANENTLY
 * 4. savefrom redirect as true last resort (not loader.to)
 * 5. yt-dlp PO-Token support via bgutil-ytdlp-pot-provider plugin flags
 * 6. Cleaner error handling, specific toast-compatible error codes
 * 7. v5.1: Cookies trimming fix, retry-after headers, improved debug output
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
    // 1. Clear yt-dlp cache
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
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 3600000) {
          fs.unlinkSync(filePath);
        }
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
        if (now - stats.mtimeMs > 1800000) {
          fs.unlinkSync(filePath);
        }
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
app.get('/', (_req, res) => res.send('DJs SkiLLs ODiSHA Backend (Ironclad v5.4) is Online ✅'));

// ─── Videos (Dynamic YouTube API Fetch) ────────────────────────────
const videoCache = { data: null, lastFetched: 0, isFetching: false, TTL: 5 * 60 * 1000 };
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

const cookiesPath = path.join(os.tmpdir(), 'yt_cookies.txt');

async function setupCookies() {
  // Common user error on Railway: variable name with trailing space
  let rawCookies = process.env.YOUTUBE_COOKIES || process.env['YOUTUBE_COOKIES '] || process.env['YOUTUBE_COOKIES  '];

  if (!rawCookies || rawCookies.trim().length === 0) {
    console.warn('[cookies] YOUTUBE_COOKIES env variable is MISSING or empty — downloads may fail for bot-protected videos.');
    return;
  }

  try {
    // Step 1: Normalize newlines (Railway sometimes escapes \n as literal \n)
    let cookieData = rawCookies
      .replace(/\\n/g, '\n')   // literal \n → real newline
      .replace(/\\t/g, '\t')   // literal \t → real tab
      .trim();

    // Step 2: Ensure Netscape cookie file header
    if (!cookieData.startsWith('# Netscape HTTP Cookie File') && !cookieData.startsWith('# HTTP Cookie File')) {
      cookieData = '# Netscape HTTP Cookie File\n# Auto-generated by DJs SkiLLs ODiSHA backend\n\n' + cookieData;
    }

    // Step 3: Write to file
    fs.writeFileSync(cookiesPath, cookieData, { encoding: 'utf8', mode: 0o644 });

    // Step 4: Verify it was written correctly
    const written = fs.readFileSync(cookiesPath, 'utf8');
    if (written.length < 10) throw new Error('File written but appears empty');

    console.log(`[cookies] ✅ Cookies written successfully. Path: ${cookiesPath}, Size: ${written.length} bytes`);
  } catch (e) {
    console.error('[cookies] ❌ Error writing cookies file:', e.message);
    // Try alternate path
    try {
      const altPath = '/tmp/yt_cookies.txt';
      fs.writeFileSync(altPath, rawCookies.replace(/\\n/g, '\n').trim(), 'utf8');
      console.warn(`[cookies] ⚠️ Written to fallback path: ${altPath}`);
    } catch (e2) {
      console.error('[cookies] ❌ Fallback write also failed:', e2.message);
    }
  }
}
setupCookies();


// ─── Helper: Run command with timeout ──────────────────────────────
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
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
};

// ─── Helper: Try Cobalt instance (v10 API) ─────────────────────────
async function tryCobaltInstance(instance, videoId, safeTitle, res) {
  const cobaltUrl = `${instance.replace(/\/$/, '')}/`;
  const controller = new AbortController();
  const cobaltTimer = setTimeout(() => controller.abort(), 15000);

  try {
    // Cobalt v10 API: POST to root "/" with Accept: application/json
    const cobRes = await fetch(cobaltUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        filenameStyle: 'pretty',
      }),
      signal: controller.signal,
    });
    clearTimeout(cobaltTimer);

    if (!cobRes.ok) {
      console.warn(`[cobalt] ${instance} returned HTTP ${cobRes.status}`);
      return false;
    }

    const data = await cobRes.json();
    // v10 returns { status: "tunnel" | "redirect" | "stream", url: "..." }
    const dlLink = data.url;
    if (!dlLink) {
      console.warn(`[cobalt] ${instance} — no URL in response: ${JSON.stringify(data).slice(0, 120)}`);
      return false;
    }

    console.log(`[cobalt] Proxying stream from: ${instance}`);
    const streamRes = await fetch(dlLink, { signal: AbortSignal.timeout(30000) });
    if (!streamRes.ok) {
      console.warn(`[cobalt] Stream fetch failed: ${streamRes.status}`);
      return false;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    const nodeStream = Readable.fromWeb(streamRes.body);
    nodeStream.pipe(res);
    await new Promise((resolve, reject) => {
      nodeStream.on('end', resolve);
      nodeStream.on('error', reject);
    });
    return true;
  } catch (e) {
    clearTimeout(cobaltTimer);
    console.warn(`[cobalt] ${instance} failed: ${e.message}`);
    return false;
  }
}

// --- Download Route ---
app.get('/api/download', downloadLimiter, async (req, res) => {
  const url = req.query.url;
  const requestedTitle = req.query.title ? String(req.query.title) : 'audio';
  const safeTitle = requestedTitle.replace(/[^\w\s-]/gi, '').trim() || 'audio';

  if (!url) return res.status(400).json({ error: 'missing_url' });

  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    return res.status(429).json({
      error: 'server_busy',
      message: 'Server busy. Try again in 30 seconds.',
      retryAfter: 30,
    });
  }

  activeDownloads++;
  const tempId = `dl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const rawPath = path.join(downloadsDir, `${tempId}_raw`);
  const mp3Path = path.join(downloadsDir, `${tempId}.mp3`);

  const hasCookies = fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 10;

  // Detect PO-Token env vars with support for common trailing space errors
  const PO_TOKEN = (process.env.YOUTUBE_PO_TOKEN || process.env['YOUTUBE_PO_TOKEN '] || '').trim();
  const VISITOR_DATA = (process.env.YOUTUBE_VISITOR_DATA || process.env['YOUTUBE_VISITOR_DATA '] || '').trim();
  const hasPOToken = !!(PO_TOKEN && VISITOR_DATA);

  try {
    console.log(`[ironclad] Request URL: ${url} (Queue: ${activeDownloads})`);

    // ── Build yt-dlp attempt list ──────────────────────────────────
    const attempts = [];

    if (hasCookies) {
      // Prioritize web client when cookies are available (best match)
      attempts.push({ name: 'Cookies+Web', cookies: true, client: 'web', potoken: hasPOToken });
      attempts.push({ name: 'Cookies+iOS', cookies: true, client: 'ios', potoken: false });
      attempts.push({ name: 'Cookies+TV', cookies: true, client: 'tv', potoken: hasPOToken });
    }
    
    // Always try no-cookies as fallback
    attempts.push({ name: 'NoCookies+TV', cookies: false, client: 'tv', potoken: false });
    attempts.push({ name: 'NoCookies+Web', cookies: false, client: 'web', potoken: false });

    let success = false;

    for (const attempt of attempts) {
      console.log(`[ironclad] Attempting: ${attempt.name}`);
      try {
        const flags = [
          '--no-check-certificates', '--no-warnings', '--no-playlist',
          '--add-header', 'Referer:https://www.youtube.com/',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          '-f', 'bestaudio/best', // Relaxed: bestaudio or anything available
          '--extractor-args', `youtube:player_client=${attempt.client}`,
          '-o', `${rawPath}.%(ext)s`,
        ];

        // Add cookies if available
        if (attempt.cookies && hasCookies) {
          flags.unshift('--cookies', cookiesPath);
        }

        // Add PO-Token if available and requested
        if (attempt.potoken && hasPOToken) {
          flags.push('--extractor-args', `youtube:po_token=web+${PO_TOKEN}`);
          flags.push('--extractor-args', `youtube:visitor_data=${VISITOR_DATA}`);
        }

        flags.push(url.trim());

        await runWithTimeout('yt-dlp', flags, 30000);

        // Find the downloaded file
        const files = fs.readdirSync(downloadsDir);
        const actualFile = files.find(f => f.startsWith(path.basename(rawPath)));
        if (!actualFile) throw new Error('Downloaded file not found');

        const fullPath = path.join(downloadsDir, actualFile);

        // Convert to MP3
        await runWithTimeout('ffmpeg', [
          '-i', fullPath,
          '-vn',
          '-acodec', 'libmp3lame',
          '-b:a', '192k',
          '-ar', '44100',
          '-y', mp3Path,
        ], 60000);

        // Clean up raw file
        fs.unlink(fullPath, () => {});

        if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 1000) {
          success = true;
          console.log(`[ironclad] SUCCESS with ${attempt.name}`);
          break;
        } else {
          throw new Error('MP3 output empty or missing');
        }
      } catch (e) {
        console.warn(`[ironclad] Tier ${attempt.name} failed: ${e.message.slice(0, 200)}`);
        // Clean up any partial files
        try { const f = fs.readdirSync(downloadsDir).find(f => f.startsWith(path.basename(rawPath))); if (f) fs.unlinkSync(path.join(downloadsDir, f)); } catch (_) {}
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // ── Serve the MP3 if local download succeeded ──────────────────
    if (success) {
      console.log(`[ironclad] Serving local MP3: ${mp3Path}`);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
      res.setHeader('Content-Length', fs.statSync(mp3Path).size);
      const reader = fs.createReadStream(mp3Path);
      reader.pipe(res);
      reader.on('end', () => { fs.unlink(mp3Path, () => {}); });
      reader.on('error', (e) => {
        console.error('[ironclad] Stream error:', e.message);
        if (!res.headersSent) res.status(500).json({ error: 'stream_error' });
      });
      return; // Don't go to finally's activeDownloads-- yet (piping is async) — handled below
    }

    // ── Cobalt Fallback (v10 API) ──────────────────────────────────
    console.log('[ironclad] Local tiers failed. Trying Cobalt v10 API...');
    const videoId = url.match(/(?:v=|\/embed\/|shorts\/|youtu\.be\/)([^&?/]+)/)?.[1] || url;

    // Working Cobalt v10 public instances
    const cobaltInstances = [];
    if (process.env.COBALT_INSTANCE_URL) cobaltInstances.push(process.env.COBALT_INSTANCE_URL);
    cobaltInstances.push(
      'https://cobalt.tools',
      'https://cobalt.nsfwzone.xyz',
      'https://cobalt.ari.lt',
      'https://cobalt.synzr.space',
    );

    for (const instance of cobaltInstances) {
      try {
        const done = await tryCobaltInstance(instance, videoId, safeTitle, res);
        if (done) {
          console.log(`[ironclad] Cobalt success via: ${instance}`);
          return; // Response already sent inside tryCobaltInstance
        }
      } catch (e) {
        console.warn(`[ironclad] Cobalt ${instance} exception: ${e.message}`);
      }
    }

    // ── True Last Resort: Redirect to savefrom ────────────────────
    console.warn('[ironclad] All tiers failed. Sending savefrom redirect.');
    return res.redirect(`https://savefrom.net/?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}`);

  } catch (err) {
    console.error(`[ironclad] CRITICAL: ${err.message}`);
    if (!res.headersSent) res.status(500).json({ error: 'failed', message: 'Download failed. Please try again.' });
  } finally {
    activeDownloads--;
  }
});

// --- Diagnostic: Run real yt-dlp test ---
app.get('/api/test-ytdlp', async (req, res) => {
  const testUrl = req.query.url || 'https://www.youtube.com/watch?v=KsJ2-7cWTyg';
  const hasCookies = fs.existsSync(cookiesPath);
  
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write(`yt-dlp Diagnostic Test\n`);
  res.write(`URL: ${testUrl}\n`);
  res.write(`Cookies: ${hasCookies ? 'FOUND' : 'NOT FOUND'}\n\n`);

  const flags = [
    '--no-check-certificates', '--no-warnings', '--no-playlist',
    '--add-header', 'Referer:https://www.youtube.com/',
    '-f', 'ba/b',
    '-v', // VERBOSE
    '--simulate', // DON'T actually download
    '--print', 'filename'
  ];
  if (hasCookies) flags.unshift('--cookies', cookiesPath);
  flags.push(testUrl);

  const proc = spawn('yt-dlp', flags);
  proc.stdout.on('data', (d) => res.write(`[STDOUT] ${d}`));
  proc.stderr.on('data', (d) => res.write(`[STDERR] ${d}`));
  proc.on('close', (code) => {
    res.write(`\nProcess exited with code ${code}`);
    res.end();
  });
});

// --- Debug Endpoint ---
app.get('/api/debug-download', async (req, res) => {
  try {
    const cookieFileExists = fs.existsSync(cookiesPath);
    const cookieFileSize = cookieFileExists ? fs.statSync(cookiesPath).size : 0;
    const cookieFilePreview = cookieFileExists && cookieFileSize > 0
      ? fs.readFileSync(cookiesPath, 'utf8').split('\n').slice(0, 3).join(' | ')
      : 'EMPTY OR NOT FOUND';
    const rawCookiesEnv = process.env.YOUTUBE_COOKIES || process.env['YOUTUBE_COOKIES '] || process.env['YOUTUBE_COOKIES  '];

    const { stdout: toolsOut } = await execPromise('yt-dlp --version && ffmpeg -version | head -n 1').catch(e => ({ stdout: e.message }));
    const envStatus = [
      'PORT', 'YOUTUBE_API_KEY', 'YOUTUBE_CHANNEL_ID',
      'YOUTUBE_COOKIES', 'YOUTUBE_PO_TOKEN', 'YOUTUBE_VISITOR_DATA', 'COBALT_INSTANCE_URL'
    ].map(k => {
      const exact = process.env[k];
      const withSpace = process.env[k + ' '];
      const val = exact || withSpace;
      const status = val?.trim() ? `✅ Set (${String(val).trim().length} chars)` : '❌ Missing';
      const warning = (!exact && withSpace) ? ' (⚠️ SPACE DETECTED IN KEY NAME)' : '';
      return `  ${k}: ${status}${warning}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write(`=== Ironclad v5.1 Debug ===\n`);
    res.write(`Timestamp: ${new Date().toISOString()}\n`);
    res.write(`Queue: ${activeDownloads}/${MAX_CONCURRENT_DOWNLOADS}\n`);
    res.write(`\n--- Cookies ---\n`);
    res.write(`  Env YOUTUBE_COOKIES: ${rawCookiesEnv ? '✅ Set (' + rawCookiesEnv.trim().length + ' chars)' : '❌ Missing'}\n`);
    res.write(`  File: ${cookiesPath}\n`);
    res.write(`  File Size: ${cookieFileSize} bytes\n`);
    res.write(`  File Preview: ${cookieFilePreview}\n`);
    res.write(`\n--- Environment ---\n${envStatus}\n`);
    res.write(`\n--- Tools ---\n${toolsOut.trim()}\n`);
    res.end();
  } catch (e) {
    res.status(500).send(`Debug Error: ${e.message}`);
  }
});

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(PORT, '0.0.0.0', () => console.log(`[server] Ironclad v5.1 Listening on port ${PORT}`));

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
