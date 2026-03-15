FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg python3 python3-pip wget curl git unzip \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp nightly
RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

# Install bgutil extractor plugin via pip
RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages

# Clone and build the bgutil PO Token server
WORKDIR /app
RUN echo "Cloning bgutil..." && \
    git clone --depth 1 https://github.com/LuanRT/bgutil-ytdlp-pot-provider.git bgutil-source && \
    cd bgutil-source/server && \
    echo "Installing bgutil dependencies..." && \
    npm install && \
    echo "Building bgutil server..." && \
    npm run build && \
    echo "Build finished. Checking for output..." && \
    ls -la build/generate_once.js

RUN yt-dlp --version && ffmpeg -version | head -n 1

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

# Backend setup
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production

COPY backend/server.mjs ./
COPY backend/scripts/ ./scripts/

EXPOSE 3000
CMD ["node", "server.mjs"]
