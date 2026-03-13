import { getApiBase } from "./utils";
import { fetchWithRetry } from "../utils/fetchWithRetry";

export interface YouTubeVideo {
  title: string;
  artist: string;
  tag: string;
  youtubeUrl: string;
  videoId: string;
  thumbnail: string;
  publishedAt: string;
}

export async function fetchLatestVideos(maxResults = 15): Promise<YouTubeVideo[]> {
  const apiBase = getApiBase();
  
  // 1. Fetch from Unified Backend (Railway)
  try {
    const url = new URL(`${apiBase}/api/videos`);
    url.searchParams.set("maxResults", String(maxResults));
    const res = await fetchWithRetry(url.toString(), {}, 2, 8000);
    
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.videos)) return data.videos;
      if (Array.isArray(data)) return data; 
    }
  } catch (e) {
    console.error("Backend fetch failed:", e);
  }

  // Strictly avoiding relative paths per Step 10.
  // We rely entirely on the Railway backend.
  return [];
}
