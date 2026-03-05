const YOUTUBE_API_KEY = "AIzaSyCHHK85TvMyyydXu35r6z18kMJHcpuheQA";
const KNOWN_VIDEO_ID = "KsJ2-7cWTyg"; // Used to discover channel ID

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
  const data = await res.json();
  if (!data.items?.length) throw new Error("Could not find channel");
  cachedChannelId = data.items[0].snippet.channelId;
  return cachedChannelId!;
}

export async function fetchLatestVideos(maxResults = 15): Promise<YouTubeVideo[]> {
  const channelId = await getChannelId();
  
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
  );
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

      // Use YouTube's provided thumbnails with safe fallbacks
      const thumbnails = snippet.thumbnails || {};
      const thumbnailUrl =
        thumbnails.maxres?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

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
