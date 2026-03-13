import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchLatestVideos, fetchAllVideos, YouTubeVideo } from "@/lib/youtube";

export function useYouTubeVideos(maxResults = 15, mode: 'latest' | 'all' = 'latest') {
  return useQuery<YouTubeVideo[]>({
    queryKey: ["youtube-videos", mode, maxResults],
    queryFn: () => mode === 'latest' ? fetchLatestVideos(maxResults) : fetchAllVideos(maxResults),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}
