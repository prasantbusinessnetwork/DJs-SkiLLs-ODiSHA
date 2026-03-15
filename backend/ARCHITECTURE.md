# Production Backend Architecture

This document describes the high-availability architecture for the DJ MP3 download backend, designed to handle thousands of simultaneous downloads safely using Railway.

## Directory Structure

```text
/backend
├── server.js                 # Entry point, configures Express, CORS, error handling
├── package.json              # Defines dependencies (axios, ytdl-core, AWS SDK for S3, rate limiter)
├── Dockerfile                # Minimal configuration for node runtime on Railway
├── middleware/
│   ├── rateLimiter.js        # Restricts each IP to 100 requests/day to prevent API abuse
│   └── errorHandler.js       # Gracefully catches unhandled stream errors to stop server crashes
├── routes/
│   ├── download.js           # Main streaming API logic prioritizing S3 Object Storage -> YouTube stream
│   └── health.js             # Vercel/Railway ping endpoint returning memory and uptime status
└── utils/
    ├── cache.js              # In-memory Map for caching YouTube titles to prevent fast API limits
    ├── logger.js             # Tracks download IP addresses and timestamps securely
    └── storage.js            # AWS SDK example implementation for S3/Supabase/Cloudflare R2 integration
```

## How It Solves Previous Instabilities

1. **Memory Spikes (Server Crashes):**
   * *Old Method:* Downloading an entire 15MB file into Node RAM, then sending to the user.
   * *New Method:* Using robust streaming pipelines (`.pipe(res)`) using `ytdl-core` directly and AWS SDK streams. A file is passed from the source to the user simultaneously in small buffer packets (kept strictly to 32MB max water marks). This lets a 512MB Railway instance handle hundreds of downloads at the exact same moment.

2. **DDoS and API Scraping (Abuse):**
   * The `express-rate-limit` package is securely injected on the `/api/download` route. If a bot or single IP attempts to download more than 100 tracks in 24 hours, the backend blocks them instantly with a graceful error message, saving your backend and storage quota.

3. **External Redirects (Poor UX):**
   * Instead of redirecting users to y2mate or loader.to when something goes wrong, the backend acts strictly as a secure proxy. The MP3 downloads directly from your domain, keeping the user on your website.

4. **Unhandled Promise Rejections (Process Death):**
   * Added `process.on('uncaughtException')` handling inside `server.js`. If YouTube denies an internal stream unexpectedly, the server logs the error, sends a `502` to the exact user requesting it, and stays running for all other users.

## How to Implement S3 Object Storage / CDN

Directly streaming from YouTube via `ytdl-core` works for high traffic, but the *ultimate* scaling solution is connecting this to an S3 Object bucket (like Cloudflare R2, which has $0 egress fees, or Supabase). 

To activate the storage connection built into `utils/storage.js`:

1. Create a Bucket (e.g., on Cloudflare R2).
2. Go to your Railway Project Variables and add:
   * `S3_REGION`="auto"
   * `S3_ENDPOINT`="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
   * `S3_ACCESS_KEY_ID`="<YOUR_KEY>"
   * `S3_SECRET_ACCESS_KEY`="<YOUR_SECRET>"
   * `S3_BUCKET_NAME`="dj-skills-odisha"

When these exist, the backend will automatically check if the song exists in your R2 bucket. If it does, it streams directly from the CDN at blazing speeds. If it doesn't, it falls back to streaming directly from YouTube securely. 

## Deployment to Railway
The `railway.json` is mapped to simply run `node server.js` from the Dockerfile. Every push to GitHub will seamlessly hot-reload the new optimized structure.
