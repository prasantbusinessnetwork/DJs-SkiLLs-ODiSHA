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

# Install bgutil plugin
RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null || \
    echo "pip install skipped"

WORKDIR /app

# Build bgutil Node.js server in /app/bgutil-server-src
RUN git clone https://github.com/v8u1i/bgutil-ytdlp-pot-provider.git /app/bgutil-server-src && \
    cd /app/bgutil-server-src/server && \
    npm install && \
    npm run build

RUN yt-dlp --version && ffmpeg -version | head -n 1

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production --ignore-scripts 2>/dev/null || npm install --production

COPY backend/server.mjs ./
COPY backend/scripts/ ./scripts/
EXPOSE 3000
CMD ["node", "server.mjs"]
