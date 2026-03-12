FROM node:18-bullseye

# Install system deps
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      python3 python3-pip ffmpeg curl ca-certificates build-essential && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (linux) system-wide
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install --upgrade "yt-dlp[default]"

WORKDIR /app

# Copy package files & install node deps
COPY backend/package*.json ./
RUN npm install --production

# Copy source
COPY backend/ ./

# Ensure server is executable
RUN chmod +x server.mjs || true

ENV NODE_ENV=production
ENV PORT=${PORT:-3000}

EXPOSE 3000

CMD ["node", "server.mjs"]
