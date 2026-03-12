/**
 * Worker: pulls jobs from Redis queue (Bull/BullMQ) and performs yt-dlp+ffmpeg,
 * uploads to S3, then stores signed URL in Redis for frontend to fetch.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const TEMP_DIR = process.env.TEMP_DIR || os.tmpdir();

async function processJob(job) {
  const url = job.url;
  const outPath = path.join(TEMP_DIR, `out-${Date.now()}.mp3`);
  // yt-dlp -> ffmpeg -> file
  const ytdlp = spawn('yt-dlp', ['-f', 'bestaudio', '-o', '-', url], { stdio: ['ignore', 'pipe', 'pipe'] });
  const ffmpeg = spawn('ffmpeg', ['-i', 'pipe:0', '-vn', '-f', 'mp3', '-ab', '128k', outPath], { stdio: ['pipe', 'inherit', 'inherit'] });
  
  ytdlp.stdout.pipe(ffmpeg.stdin);
  
  ffmpeg.on('close', (code) => {
    if (code === 0) {
      console.log(`Worker: Finished processing ${url}. Saved to ${outPath}`);
      // TODO: upload to S3 and create signed URL, then save to Redis or DB
      if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    } else {
      console.error('ffmpeg failed', code);
    }
  });
}

console.log("Worker started. Waiting for jobs...");
// NOTE: implement queue consumer using Bull/BullMQ and actual S3 upload in production.
