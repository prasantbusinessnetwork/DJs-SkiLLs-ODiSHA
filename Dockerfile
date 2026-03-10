FROM node:20-slim

# Install yt-dlp and ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl && \
    pip3 install curl_cffi && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Ensure downloads directory exists
RUN mkdir -p downloads

EXPOSE 3000

CMD ["node", "server.mjs"]
