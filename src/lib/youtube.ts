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

// Read from environment so we can configure per-deploy (Vercel, local, etc.)
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
const YOUTUBE_CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string | undefined;

export async function fetchLatestVideos(maxResults = 15): Promise<YouTubeVideo[]> {
  // Safety guard: avoid hard failures in UI if env is misconfigured.
  if (!YOUTUBE_API_KEY || !YOUTUBE_CHANNEL_ID) {
    console.error(
      "Missing VITE_YOUTUBE_API_KEY or VITE_YOUTUBE_CHANNEL_ID. Returning empty video list."
    );
    return [];
  }

  // 1) Try local backend first **only** when explicitly configured.
  // This is ideal for non-Vercel Node hosts (Render/Railway) where
  // we want caching and to keep the API key off the client.
  const explicitApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicitApiBase) {
    try {
      const localRes = await fetch(
        `${explicitApiBase}/api/videos?maxResults=${maxResults}`
      );

      if (localRes.ok) {
        const videos = await localRes.json();
        if (Array.isArray(videos) && videos.length > 0) {
          return videos;
        }
      } else if (localRes.status === 503) {
        console.log("Backend cache warming up, falling back to YouTube API.");
      } else {
        console.warn(
          "Local video API returned non-ok status, falling back to YouTube API:",
          localRes.status
        );
      }
    } catch (err) {
      console.warn("Local video API failed, falling back to YouTube API:", err);
    }
  }

  // 2) Call YouTube Data API v3 directly (optimized for Vercel/browser)
  const searchParams = new URLSearchParams({
    part: "snippet",
    channelId: YOUTUBE_CHANNEL_ID,
    order: "date",
    type: "video",
    maxResults: String(maxResults),
    key: YOUTUBE_API_KEY,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
  );
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("YouTube API fetchLatestVideos error:", errorData);
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();

  if (!data.items?.length) return [];

  return data.items
    .map((item: any, index: number) => {
      const videoId = item.id?.videoId;
      const snippet = item.snippet;

      if (!videoId || !snippet) return null;

      // Skip deleted/private videos that only show generic placeholders
      const title: string = snippet.title || "";
      const normalizedTitle = title.toLowerCase();
      if (
        normalizedTitle.includes("private video") ||
        normalizedTitle.includes("deleted video")
      ) {
        return null;
      }

      // Use mqdefault (320x180, ~15 KB) — plenty sharp for a 200-260px card.
      // maxres/high (~100 KB) is wasteful at card size and slows first load.
      const thumbnails = snippet.thumbnails || {};
      const thumbnailUrl =
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      return {
        title,
        artist: snippet.channelTitle,
        tag: index === 0 ? "Latest" : "Remix",
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        thumbnail: thumbnailUrl,
        publishedAt: snippet.publishedAt,
      } as YouTubeVideo;
    })
    .filter((v: YouTubeVideo | null): v is YouTubeVideo => v !== null);
}
