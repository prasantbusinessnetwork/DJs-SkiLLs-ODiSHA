import { useQuery } from "@tanstack/react-query";
import { fetchLatestVideos, YouTubeVideo } from "@/lib/youtube";

export function useYouTubeVideos(maxResults = 15) {
  return useQuery<YouTubeVideo[]>({
    queryKey: ["youtube-videos", maxResults],
    queryFn: () => fetchLatestVideos(maxResults),
    // Keep data "fresh" so new uploads appear quickly
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
  });
}
