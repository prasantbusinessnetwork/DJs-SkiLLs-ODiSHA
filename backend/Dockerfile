FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp nightly build
RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Install bgutil PO-Token provider plugin for yt-dlp
RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null || \
    pip3 install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null || \
    echo "bgutil install skipped"

# Verify tools
RUN yt-dlp --version && ffmpeg -version | head -n 1

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

WORKDIR /app

# Railway: When dockerfilePath = "backend/Dockerfile", build context = REPO ROOT
# So ALL paths below are relative to REPO ROOT
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production --ignore-scripts 2>/dev/null || npm install --production

# Copy server and scripts from backend/ folder
COPY backend/server.mjs ./
COPY backend/scripts/ ./scripts/

EXPOSE 3000
CMD ["node", "server.mjs"]
