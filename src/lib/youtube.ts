import { getApiBase } from "./utils";

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
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(3000) });
    
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.videos)) return data.videos;
      if (Array.isArray(data)) return data; // Compatibility with my original format
    }
  } catch (e) {
    console.warn("Local backend failed, checking Vercel serverless route...");
  }

  // 2. Try Vercel Serverless API Route (Vercel deployments)
  try {
    const vercelRes = await fetch(`/api/youtube?maxResults=${maxResults}`);
    if (vercelRes.ok) {
      const videos = await vercelRes.json();
      if (Array.isArray(videos)) return videos;
    }
  } catch (e) {
    console.error("Vercel serverless fallback failed:", e);
  }

  return [];
}
