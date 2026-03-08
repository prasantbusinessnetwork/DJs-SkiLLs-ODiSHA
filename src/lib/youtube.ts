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

// Frontend helper: always go through our backend to keep the API key secret.
export async function fetchLatestVideos(maxResults = 15): Promise<YouTubeVideo[]> {
  const apiBase = getApiBase();
  const url = new URL(`${apiBase}/api/latest-videos`);
  url.searchParams.set("maxResults", String(maxResults));

  const res = await fetch(url.toString());

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Backend fetchLatestVideos error:", errorData);
    throw new Error(`Backend error: ${res.status}`);
  }

  const data = await res.json();

  if (!data || !Array.isArray(data.videos)) {
    console.warn("Backend /api/latest-videos returned unexpected shape:", data);
    return [];
  }

  return data.videos as YouTubeVideo[];
}
