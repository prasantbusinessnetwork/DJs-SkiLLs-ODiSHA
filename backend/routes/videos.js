import express from 'express';

const router = express.Router();

const videoCache = { data: null, lastFetched: 0, TTL: 5 * 60 * 1000 };
const fallbackVideos = [
  { title: "Aaj Ki Raat (Remix) - DJs SkILLs ODISHA", artist: "DJs SkILLs ODISHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=KsJ2-7cWTyg", videoId: "KsJ2-7cWTyg", thumbnail: "https://img.youtube.com/vi/KsJ2-7cWTyg/mqdefault.jpg" },
  { title: "Tum Toh Dhokebaaz Ho - DJs SkiLLs ODiSHA", artist: "DJs SkiLLs ODiSHA", tag: "Tapori Mix", youtubeUrl: "https://www.youtube.com/watch?v=uYTeGgKheFw", videoId: "uYTeGgKheFw", thumbnail: "https://img.youtube.com/vi/uYTeGgKheFw/mqdefault.jpg" },
  { title: "JAMAL KUDU REMIX - DJs SkiLLs ODiSHA", artist: "DJs SkiLLs ODiSHA", tag: "Trending", youtubeUrl: "https://www.youtube.com/watch?v=a5EEWUnI8rg", videoId: "a5EEWUnI8rg", thumbnail: "https://img.youtube.com/vi/a5EEWUnI8rg/mqdefault.jpg" },
  { title: "SOFTLY (Remix) - DJs SkiLLs ODiSHA", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=k_smLZTvPug", videoId: "k_smLZTvPug", thumbnail: "https://img.youtube.com/vi/k_smLZTvPug/mqdefault.jpg" },
  { title: "Illuminati (Remix) - DJs SkiLLs ODiSHA", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=hK651bev0uI", videoId: "hK651bev0uI", thumbnail: "https://img.youtube.com/vi/hK651bev0uI/mqdefault.jpg" },
  { title: "Pushpa 2 Title Track (Remix)", artist: "DJs SkiLLs ODiSHA", tag: "Remix", youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
];

async function fetchFullChannelVideos(apiKey, channelId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=50&type=video&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`[YouTube API] Error: ${response.status}`);
        return [];
    }
    const data = await response.json();
    if (!data.items) return [];
    return data.items.map(item => ({
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      tag: "Remix",
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails?.high?.url || `https://img.youtube.com/vi/${item.id.videoId}/mqdefault.jpg`,
      publishedAt: item.snippet.publishedAt
    }));
  } catch (e) {
    console.error("[YouTube API] Fetch failed:", e.message);
    return [];
  }
}

router.get('/latest', async (req, res) => {
  const API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  const now = Date.now();
  if (videoCache.data && (now - videoCache.lastFetched < videoCache.TTL)) return res.json(videoCache.data.slice(0, 5));
  fetchFullChannelVideos(API_KEY, CHANNEL_ID).then(v => { if (v.length) { videoCache.data = v; videoCache.lastFetched = now; } });
  res.json((videoCache.data || fallbackVideos).slice(0, 5));
});

router.get('/videos', async (req, res) => {
  const API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyBSPbc6qQtGvjqtj20r7oWpXcCdXfUfsro";
  const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UC8FEwv0WXF5db-pIs8uJkag";
  if (videoCache.data && (Date.now() - videoCache.lastFetched < videoCache.TTL)) return res.json(videoCache.data);
  const v = await fetchFullChannelVideos(API_KEY, CHANNEL_ID);
  if (v.length) { videoCache.data = v; videoCache.lastFetched = Date.now(); }
  res.json(videoCache.data || fallbackVideos);
});

export default router;
