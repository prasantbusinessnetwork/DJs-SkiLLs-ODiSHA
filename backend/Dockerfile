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
RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages || \
    pip3 install -U bgutil-ytdlp-pot-provider --break-system-packages || true

# Verify tools installed
RUN yt-dlp --version && ffmpeg -version | head -n 1

# Set Node path for bgutil's BotGuard solver
ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

WORKDIR /app

# NOTE: Railway builds from repo root when dockerfilePath = "backend/Dockerfile"
# The build context is the REPO ROOT, so paths are relative to root
COPY package*.json ./
RUN npm install --production --ignore-scripts 2>/dev/null || npm install --production

# Copy backend source files
COPY server.mjs ./
COPY scripts/ ./scripts/

EXPOSE 3000
CMD ["node", "server.mjs"]
