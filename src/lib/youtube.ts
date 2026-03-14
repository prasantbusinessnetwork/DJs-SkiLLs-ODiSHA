const API = import.meta.env.VITE_API_URL || "https://djs-skills-odisha-production.up.railway.app";

export interface YouTubeVideo {
  title: string;
  artist: string;
  tag: string;
  youtubeUrl: string;
  videoId: string;
  thumbnail: string;
  publishedAt: string;
}

export async function fetchLatestVideos(maxResults = 5): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(`${API}/api/latest`);
    
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error("Latest videos fetch failed:", e);
  }

  return [];
}

export async function fetchAllVideos(maxResults = 500): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(`${API}/api/videos`);
    
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error("All videos fetch failed:", e);
  }

  return [];
}
