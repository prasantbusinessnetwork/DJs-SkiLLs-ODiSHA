export interface YouTubeVideo {
  title: string;
  artist: string;
  tag: string;
  youtubeUrl: string;
  videoId: string;
  thumbnail: string;
  publishedAt: string;
}

export default async function handler(req: any, res: any) {
  const apiKey = process.env.NEXT_PUBLIC_YT_API_KEY || process.env.YOUTUBE_API_KEY;
  const channelId = process.env.NEXT_PUBLIC_YT_CHANNEL_ID || process.env.YOUTUBE_CHANNEL_ID;
  const { maxResults = 6 } = req.query;

  if (!apiKey || !channelId) {
    console.error("Missing YouTube API Key or Channel ID in environment variables");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet,id&channelId=${channelId}&order=date&maxResults=${maxResults}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("YouTube API error:", errorData);
      return res.status(response.status).json({ error: "Failed to fetch from YouTube" });
    }

    const data = await response.json();
    
    const videos: YouTubeVideo[] = data.items
      .filter((item: any) => item.id.kind === "youtube#video")
      .map((item: any, index: number) => {
        const videoId = item.id.videoId;
        const snippet = item.snippet;

        // Skip deleted/private videos
        const title = snippet.title || "";
        const normalizedTitle = title.toLowerCase();
        if (normalizedTitle.includes("private video") || normalizedTitle.includes("deleted video")) {
          return null;
        }

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
        };
      })
      .filter((v: any) => v !== null);

    res.status(200).json(videos);
  } catch (error: any) {
    console.error("API Route Error:", error);
    res.status(500).json({ error: error.message });
  }
}
