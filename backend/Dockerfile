FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# INSTALL BGUTIL AND CLONE SERVER
RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null || \
    pip3 install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null

RUN cd /root && git clone https://github.com/v8u1i/bgutil-ytdlp-pot-provider.git && \
    cd bgutil-ytdlp-pot-provider/server && \
    npm install && \
    npm run build

# VERIFY BGUTIL
RUN yt-dlp --verbose --simulate \
    --extractor-args "youtube:player_client=tv,web" \
    "https://www.youtube.com/watch?v=KsJ2-7cWTyg" 2>&1 | head -20 || true

RUN yt-dlp --version && ffmpeg -version | head -n 1

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production --ignore-scripts 2>/dev/null || npm install --production

COPY backend/server.mjs ./
COPY backend/scripts/ ./scripts/

EXPOSE 3000
CMD ["node", "server.mjs"]
