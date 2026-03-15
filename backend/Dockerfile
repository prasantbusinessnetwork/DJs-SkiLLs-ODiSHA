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

WORKDIR /app

# INSTALL BGUTIL FROM GIT
RUN pip install -U git+https://github.com/v8u1i/bgutil-ytdlp-pot-provider.git --break-system-packages

# CLONE AND BUILD SERVER IN /app/bgutil-server
RUN git clone https://github.com/v8u1i/bgutil-ytdlp-pot-provider.git /app/bgutil-server && \
    cd /app/bgutil-server/server && \
    npm install && \
    npm run build

# VERIFY BGUTIL (pointing to the local home)
RUN yt-dlp --verbose --simulate \
    --extractor-args "youtube:server_home=/app/bgutil-server/server" \
    "https://www.youtube.com/watch?v=KsJ2-7cWTyg" 2>&1 | head -20 || true

RUN yt-dlp --version && ffmpeg -version | head -n 1

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production --ignore-scripts 2>/dev/null || npm install --production

COPY backend/server.mjs ./
COPY backend/scripts/ ./scripts/

EXPOSE 3000
CMD ["node", "server.mjs"]
