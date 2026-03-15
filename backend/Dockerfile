FROM node:20-slim

# ESSENTIALS ONLY FOR STABILITY
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# YT-DLP
RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# PIP BGUTIL
RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages

# OPTIONAL BGUTIL SERVER (Non-failing build)
RUN wget -q https://github.com/v8u1i/bgutil-ytdlp-pot-provider/archive/refs/heads/main.zip -O bgutil.zip || echo "failed wget"
RUN if [ -f bgutil.zip ]; then \
    unzip bgutil.zip && \
    mv bgutil-ytdlp-pot-provider-main bgutil-server && \
    rm bgutil.zip; \
    fi

# BAKE IN SERVER - Attempt npm build but don't fail the whole build
RUN if [ -d bgutil-server/server ]; then \
    cd bgutil-server/server && \
    npm install && \
    npm run build || echo "bgutil build failed"; \
    fi

ENV NODE_PATH=/usr/local/lib/node_modules
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production --ignore-scripts || npm install --production

COPY backend/server.mjs ./
COPY backend/scripts/ ./scripts/

EXPOSE 3000
CMD ["node", "server.mjs"]
