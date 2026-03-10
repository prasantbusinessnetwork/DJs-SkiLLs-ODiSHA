# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the Vite frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .

# Build the Vite React app.
# VITE_API_BASE_URL is baked-in at build time so the browser knows
# where to find the backend. Pass it as a build arg so you can override it.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production backend image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim

# Install system dependencies:
#   ffmpeg  — audio conversion
#   python3 — required by some yt-dlp helpers (optional but safe to include)
#   curl    — used to download yt-dlp binary
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        python3 \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install only production npm dependencies
COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline

# Copy backend source files
COPY server.mjs ./

# Copy the built frontend from Stage 1
COPY --from=frontend-builder /build/dist ./dist

# Create downloads directory (used for temporary MP3 cache)
RUN mkdir -p downloads && chmod 777 downloads

# Serve static frontend via the Express backend (optional — add static middleware if needed)
# The backend itself also exposes /api/* routes on the same port.
EXPOSE 3000

# Healthcheck — lets Docker/Railway/Antigravity know the container is alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Environment variables (override at runtime — NEVER bake API keys into the image)
# ENV YT_API_KEY=
# ENV CHANNEL_ID=
# ENV SUPABASE_URL=
# ENV SUPABASE_SERVICE_ROLE_KEY=
# ENV SUPABASE_BUCKET=songs
# ENV PORT=3000

CMD ["node", "server.mjs"]
