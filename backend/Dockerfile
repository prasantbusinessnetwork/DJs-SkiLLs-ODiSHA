FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp nightly and the POT provider plugin
RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    pip install -U bgutil-ytdlp-pot-provider --break-system-packages

# Add Node to the path for bgutil's BotGuard solver
ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production
WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

EXPOSE 3000
CMD ["node", "server.mjs"]
