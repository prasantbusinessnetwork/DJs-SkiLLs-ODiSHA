FROM node:20-slim

WORKDIR /app

# Install yt-dlp and python (needed by yt-dlp)
RUN apt-get update && apt-get install -y python3 curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production

# Copy all backend source files
COPY backend/ ./

EXPOSE 3000
CMD ["node", "server.js"]
