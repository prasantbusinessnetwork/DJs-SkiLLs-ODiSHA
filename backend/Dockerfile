FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg python3 python3-pip wget curl \
    && rm -rf /var/lib/apt/lists/*

RUN wget -q https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp \
    -O /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

RUN pip install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null || \
    pip3 install -U bgutil-ytdlp-pot-provider --break-system-packages 2>/dev/null || \
    echo "bgutil install skipped"

RUN python3 -c "\
import os, subprocess, bgutil_ytdlp_pot_provider; \
srv = os.path.join(os.path.dirname(bgutil_ytdlp_pot_provider.__file__), 'server'); \
print('[bgutil] Building server at:', srv); \
subprocess.run(['npm', 'install'], cwd=srv, check=True); \
subprocess.run(['npm', 'run', 'build'], cwd=srv, check=True); \
built = os.path.exists(os.path.join(srv, 'build', 'generate_once.js')); \
print('[bgutil] generate_once.js:', 'FOUND' if built else 'MISSING')" \
|| echo "bgutil build skipped"

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
