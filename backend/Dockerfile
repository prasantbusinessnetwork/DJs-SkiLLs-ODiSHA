FROM node:18-bullseye-slim

# ── System dependencies ──────────────────────────────────────────────────────
# ffmpeg: audio encoding
# python3 + pip: needed to install yt-dlp
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      ffmpeg \
      python3 \
      python3-pip \
      ca-certificates \
      curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# ── yt-dlp: install latest stable release ────────────────────────────────────
# --break-system-packages is required on Debian 12+ / newer pip
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# ── Verify tools are available ────────────────────────────────────────────────
RUN yt-dlp --version && ffmpeg -version | head -1

# ── App ───────────────────────────────────────────────────────────────────────
WORKDIR /app

COPY package*.json ./
RUN npm install --production --no-optional

COPY . .

ENV NODE_ENV=production

# Railway sets PORT dynamically — we must not hardcode it
EXPOSE 3000

CMD ["node", "server.mjs"]
