FROM node:20-slim

# ESSENTIALS
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# YT-DLP
RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# PIP BGUTIL (Minimal install)
RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null || echo "pip skipped"

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production --ignore-scripts || npm install --production

COPY backend/server.mjs ./
COPY backend/scripts/ ./scripts/

EXPOSE 3000
CMD ["node", "server.mjs"]
