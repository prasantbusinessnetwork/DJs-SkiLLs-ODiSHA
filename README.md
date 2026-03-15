# DJs SkiLLs ODiSHA - Ironclad v6.5
Backend recovery in progress.

This project is a high-performance web application for DJs SkiLLs ODiSHA, featuring a robust YouTube-to-MP3 download system and a dynamic video showcase.

## Technologies Used

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn-ui, Lucide Icons.
- **Backend**: Express.js, `yt-dlp.exe`, `ffmpeg`.
- **State Management**: TanStack Query (React Query).

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- Docker (for production emulation)
- FFmpeg & yt-dlp (for local non-docker runs)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

1. Start the frontend:
   ```bash
   npm run dev
   ```
2. Start the backend:
   ```bash
   node server.mjs
   ```

## Deploy (Docker / Railway)

1. Ensure `yt-dlp.exe` is removed (`git rm yt-dlp.exe`).
2. Push to GitHub. Railway will detect the `Dockerfile` and build the Linux-native environment automatically.
3. The server uses streaming and Redis caching (optional) to ensure high performance.

## Project Structure

- `src/`: React components, pages, and hooks.
- `public/`: Static assets.
- `server.mjs`: High-performance streaming backend.
- `Dockerfile`: Production environment definition.
- `.github/workflows/ci.yml`: Automated CI/CD health checks.

## Credits

- **Artist**: DJs SkiLLs ODiSHA
- **Developer & Designer**: Sudhansu Kumar
- **Visuals**: DC Films
