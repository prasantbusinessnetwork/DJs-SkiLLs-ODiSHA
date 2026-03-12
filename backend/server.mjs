/**
 * server.mjs
 * - Streams YouTube audio: yt-dlp -> ffmpeg -> HTTP response
 * - Listens on process.env.PORT || 3000
 * - Simple Redis caching for metadata (optional)
 * - Basic rate-limiting and health endpoint
 */

import http from 'http';
import { spawn } from 'child_process';
import { URL } from 'url';
import { createClient as createRedisClient } from 'ioredis';
import os from 'os';

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || null;

let redis = null;
if (REDIS_URL) {
  redis = new createRedisClient(REDIS_URL);
  redis.on('error', (e) => console.error('Redis error', e));
}

function validateYouTubeUrl(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    return host.includes('youtube.com') || host.includes('youtu.be');
  } catch (e) {
    return false;
  }
}

function getVideoIdFromUrl(u) {
  try {
    const urlObj = new URL(u);
    if (urlObj.hostname.includes('youtu.be')) return urlObj.pathname.slice(1);
    return urlObj.searchParams.get('v') || null;
  } catch (e) {
    return null;
  }
}

async function cacheGet(key) {
  if (!redis) return null;
  try { return await redis.get(key); } catch (e) { return null; }
}
async function cacheSet(key, value, ttl = 3600) {
  if (!redis) return;
  try { await redis.set(key, value, 'EX', ttl); } catch (e) {}
}

function streamYouTubeAudio(res, videoUrl, filename = 'audio.mp3') {
  // spawn yt-dlp -> write to stdout, pipe to ffmpeg stdin, ffmpeg outputs mp3 to stdout
  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio',
    '--no-playlist',
    '--no-check-certificate',
    '--extractor-args', 'youtube:player_client=android,ios',
    '-o', '-',
    videoUrl
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'warning',
    '-i', 'pipe:0',
    '-vn',
    '-f', 'mp3',
    '-ab', '128k',
    'pipe:1'
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ytdlp.stderr.on('data', d => console.error('[yt-dlp]', d.toString()));
  ffmpeg.stderr.on('data', d => console.error('[ffmpeg]', d.toString()));

  // Pipe yt-dlp stdout into ffmpeg stdin
  ytdlp.stdout.pipe(ffmpeg.stdin);

  // Set response headers
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Transfer-Encoding': 'chunked'
  });

  // Pipe ffmpeg stdout to response
  ffmpeg.stdout.pipe(res);

  // Cleanup function
  function cleanup() {
    try { ytdlp.kill('SIGKILL'); } catch (e) {}
    try { ffmpeg.kill('SIGKILL'); } catch (e) {}
  }

  // Client abort => cleanup children
  res.on('close', () => {
    cleanup();
  });

  // Safety timeout
  const timeout = setTimeout(() => {
    console.error('Timeout reached, killing processes.');
    cleanup();
  }, 1000 * 60 * 5); // 5 minutes

  // Clear timeout when done
  ffmpeg.stdout.on('end', () => {
    clearTimeout(timeout);
    res.end();
    cleanup();
  });

  // Error handling
  ffmpeg.on('error', (e) => {
    console.error('ffmpeg error', e);
    try { 
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'ffmpeg_error' })); 
      }
    } catch (e) {}
    cleanup();
  });

  ytdlp.on('error', (e) => {
    console.error('yt-dlp spawn error', e);
    try { 
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'ytdlp_spawn_error' })); 
      }
    } catch (e) {}
    cleanup();
  });
}

async function handleDownload(req, res, query) {
  const videoUrl = query.get('url') || query.get('v');
  if (!videoUrl || !validateYouTubeUrl(videoUrl)) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'invalid_url' }));
    return;
  }

  const videoId = getVideoIdFromUrl(videoUrl) || 'unknown';

  // Metadata caching
  const metaKey = `video:meta:${videoId}`;
  if (redis) {
    const cached = await cacheGet(metaKey);
    if (cached) {
      try {
        const meta = JSON.parse(cached);
        const filename = `${meta.title.replace(/[^a-z0-9\-_\. ]/gi, '_')}.mp3`;
        return streamYouTubeAudio(res, videoUrl, filename);
      } catch (e) {
        return streamYouTubeAudio(res, videoUrl);
      }
    }
  }

  try {
    // metadata dump
    const dump = spawn('yt-dlp', ['--dump-json', '--no-warnings', '--no-playlist', '--no-check-certificate', videoUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    for await (const chunk of dump.stdout) out += chunk;
    const parsed = out ? JSON.parse(out.split('\n')[0]) : null;
    if (parsed && redis) {
      await cacheSet(metaKey, JSON.stringify({ title: parsed.title || `audio-${videoId}` }), 3600 * 6);
      const filename = `${(parsed.title || 'audio').replace(/[^a-z0-9\-_\. ]/gi, '_')}.mp3`;
      return streamYouTubeAudio(res, videoUrl, filename);
    } else {
      return streamYouTubeAudio(res, videoUrl);
    }
  } catch (e) {
    console.error('metadata error', e);
    return streamYouTubeAudio(res, videoUrl);
  }
}

function requestHandler(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  
  // CORS support
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (u.pathname === '/health' || u.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', hostname: os.hostname(), engine: 'blueprint-v1' }));
    return;
  }
  
  if (u.pathname === '/download' || u.pathname === '/api/download') {
    handleDownload(req, res, u.searchParams).catch(e => {
      console.error('download handler error', e);
      try { 
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); 
          res.end(JSON.stringify({ error: 'internal' })); 
        }
      } catch (e) {}
    });
    return;
  }

  if (u.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body><h3>DJ Skills API (Streaming)</h3><p>Use /api/download?url=&lt;youtube_url&gt;</p></body></html>`);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

const server = http.createServer(requestHandler);

process.on('SIGINT', () => {
  console.log('SIGINT: shutting down');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('SIGTERM: shutting down');
  server.close(() => process.exit(0));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Production Server listening on port ${PORT}`);
});
