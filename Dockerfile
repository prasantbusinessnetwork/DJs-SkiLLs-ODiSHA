FROM node:20-slim

# Install system dependencies (ffmpeg, python3 for yt-dlp, and curl)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the frontend (Vite generates 'dist' folder)
RUN npm run build

# Ensure the app runs on Port 3000 (default for our server.js)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
