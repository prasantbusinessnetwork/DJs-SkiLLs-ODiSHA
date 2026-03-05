import { useQuery } from "@tanstack/react-query";
import { fetchLatestVideos, YouTubeVideo } from "@/lib/youtube";

export function useYouTubeVideos(maxResults = 15) {
  return useQuery<YouTubeVideo[]>({
    queryKey: ["youtube-videos", maxResults],
    queryFn: () => fetchLatestVideos(maxResults),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
