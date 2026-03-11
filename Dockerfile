FROM node:20-slim

# --- 1. INSTALL SYSTEM BINARIES (FFmpeg + Python3 + yt-dlp) ---
# yt-dlp requires python3 for extraction.
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Latest Linux yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# --- 2. INSTALL NODE DEPENDENCIES ---
# Copy package manifests first for better Docker layer caching
COPY package*.json ./
RUN npm install --production=false

# --- 3. BUILD FRONTEND ---
# Copy all source files
COPY . .
# Vite build creates the 'dist' folder
RUN npm run build

# --- 4. RUN SERVER ---
# Ensure port 3000 is open (Railway will map the PORT env var accordingly)
# Our server.js also listens on 0.0.0.0 to be reachable.
EXPOSE 3000

# Start the built production server
CMD ["npm", "start"]
