FROM node:18

RUN apt-get update && apt-get install -y ffmpeg python3 python3-pip

RUN pip install --break-system-packages -U https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz

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
