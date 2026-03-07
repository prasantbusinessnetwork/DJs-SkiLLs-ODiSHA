import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchLatestVideos, YouTubeVideo } from "@/lib/youtube";

export function useYouTubeVideos(maxResults = 15) {
  return useQuery<YouTubeVideo[]>({
    queryKey: ["youtube-videos", maxResults],
    queryFn: () => fetchLatestVideos(maxResults),
    // 10 minutes before refetch — channel doesn't post every minute
    staleTime: 10 * 60 * 1000,
    // Keep data in memory for 30 min between navigations (no re-fetch on back)
    gcTime: 30 * 60 * 1000,
    // No loading spinner flash when navigating back to this page
    placeholderData: keepPreviousData,
    retry: 2,
  });
}
