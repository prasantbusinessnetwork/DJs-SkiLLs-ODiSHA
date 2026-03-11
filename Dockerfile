# --- 1. BUILD PHASE (Build the React Frontend) ---
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy all source and build the frontend (creates /app/dist)
COPY . .
RUN npm run build

# --- 2. RUN PHASE (The final production image) ---
FROM node:20-slim

# Install system binaries: ffmpeg (for transcoding) + python (for yt-dlp) + curl
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Latest Linux yt-dlp binary (Railway uses Linux)
# We force a fresh download to ensure we have the latest bypasses
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    /usr/local/bin/yt-dlp --version

WORKDIR /app

# Install ONLY production dependencies to keep the image small
COPY package*.json ./
RUN npm install --production

# Copy the built frontend from the build stage
COPY --from=build /app/dist ./dist

# Copy the main backend code and other necessary files
COPY server.js .
# Note: .env is typically gitignored and should NOT be copied. 
# Railway environment variables should be set in the dashboard.

# Railway maps the PORT env var for us.
# Express server is configured to listen on 0.0.0.0:${PORT}
ENV PORT=3000
EXPOSE 3000

# Health check to ensure the container is alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]
