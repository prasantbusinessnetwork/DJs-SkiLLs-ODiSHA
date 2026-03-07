const YOUTUBE_API_KEY = "AIzaSyCHHK85TvMyyydXu35r6z18kMJHcpuheQA";
const KNOWN_VIDEO_ID = "KsJ2-7cWTyg"; // Used to discover channel ID
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

let cachedChannelId: string | null = null;

async function getChannelId(): Promise<string> {
  if (cachedChannelId) return cachedChannelId;
  
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${KNOWN_VIDEO_ID}&key=${YOUTUBE_API_KEY}`
  );
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("YouTube API getChannelId error:", errorData);
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.items?.length) throw new Error("Could not find channel");
  cachedChannelId = data.items[0].snippet.channelId;
  return cachedChannelId!;
}

export async function fetchLatestVideos(maxResults = 15): Promise<YouTubeVideo[]> {
  // Try local backend first
  while (true) {
    try {
      const apiBase = getApiBase();
      const localRes = await fetch(`${apiBase}/api/videos?maxResults=${maxResults}`);
      
      if (localRes.ok) {
        const videos = await localRes.json();
        if (Array.isArray(videos) && videos.length > 0) {
          return videos;
        }
      } else if (localRes.status === 503) {
        // Backend is warming up its cache, wait a second and retry
        console.log("Backend cache is warming up, retrying in 1s...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      } else {
        // Some other error, break out and use fallback
        break;
      }
    } catch (err) {
      console.warn("Local video API failed, falling back to Google API:", err);
      break;
    }
  }

  console.log("Falling back to standard Google API request");
  // Fallback to Google API
  const channelId = await getChannelId();
  
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
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
