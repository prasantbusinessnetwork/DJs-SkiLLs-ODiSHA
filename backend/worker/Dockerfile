FROM node:18-bullseye
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --upgrade "yt-dlp[default]"
WORKDIR /worker
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "worker/index.js"]
