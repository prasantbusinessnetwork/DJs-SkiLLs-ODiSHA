FROM node:18-bullseye

# ── System dependencies ──────────────────────────────────────────────────────
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ffmpeg \
      python3 \
      python3-pip \
      ca-certificates \
      curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ── Install latest yt-dlp via pip (bullseye uses pip 20.x — no --break-system-packages needed) ──
RUN pip3 install -U yt-dlp

# ── Verify tools ─────────────────────────────────────────────────────────────
RUN yt-dlp --version && ffmpeg -version | head -1

# ── App ───────────────────────────────────────────────────────────────────────
WORKDIR /app

# Copy from repo root context (railway.json sets dockerfilePath: backend/Dockerfile)
COPY backend/package*.json ./
RUN npm install --production --no-optional

COPY backend/ ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.mjs"]
