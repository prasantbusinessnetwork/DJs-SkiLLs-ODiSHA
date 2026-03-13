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
  
  // 1. Try Local/Custom Backend first (fastest)
  try {
    const url = new URL(`${apiBase}/api/latest-videos`);
    url.searchParams.set("maxResults", String(maxResults));
    const res = await fetchWithRetry(url.toString(), {}, 2, 8000);
    
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.videos)) return data.videos;
      if (Array.isArray(data)) return data; 
    }
  } catch (e) {
    if (window.location.hostname === "localhost") {
       console.warn("Local backend fetch timed out or failed.");
    }
  }

  // 2. Try Vercel Serverless API Route (only if not on localhost or if local failed)
  try {
    const vercelRes = await fetchWithRetry(`/api/youtube?maxResults=${maxResults}`, {}, 1, 10000);
    const contentType = vercelRes.headers.get("content-type");
    if (vercelRes.ok && contentType?.includes("application/json")) {
      const videos = await vercelRes.json();
      if (Array.isArray(videos)) return videos;
    }
  } catch (e) {
    console.error("Vercel serverless fallback failed:", e);
  }

  return [];
}
