import { getApiBase } from "./utils";
import { fetchWithRetry } from "../utils/fetchWithRetry";

const API = import.meta.env.VITE_API_URL || getApiBase();

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
  const apiBase = getApiBase();
  
  try {
    const url = new URL(`${apiBase}/api/latest`);
    const res = await fetchWithRetry(url.toString(), {}, 2, 8000);
    
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error("Latest videos fetch failed:", e);
  }

  return [];
}

export async function fetchAllVideos(maxResults = 50): Promise<YouTubeVideo[]> {
  const apiBase = getApiBase();
  
  try {
    const url = new URL(`${apiBase}/api/videos`);
    url.searchParams.set("maxResults", String(maxResults));
    const res = await fetchWithRetry(url.toString(), {}, 2, 8000);
    
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.error("All videos fetch failed:", e);
  }

  return [];
}
