# --- 1. BUILD PHASE ---
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- 2. RUN PHASE ---
FROM node:20-slim

# Install FFMPEG and Python (Required for yt-dlp)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Latest yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Install ONLY production dependencies
COPY package*.json ./
RUN npm install --production

# Copy frontend build
COPY --from=build /app/dist ./dist
# Copy backend code
COPY server.js .

ENV PORT=3000
EXPOSE 3000

# Start command ensures latest yt-dlp
CMD ["node", "server.js"]
