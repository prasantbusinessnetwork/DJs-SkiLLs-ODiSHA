FROM node:20-slim

# Install system dependencies: Python3 (REQUIRED for yt-dlp) and FFmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (youtube-dl-exec will download the binary during postinstall)
RUN npm install

# Copy the rest of the code
COPY . .

# Satify Railway build requirement (if it uses Docker build then npm run build)
# We already added "build": "echo ..." to package.json
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
