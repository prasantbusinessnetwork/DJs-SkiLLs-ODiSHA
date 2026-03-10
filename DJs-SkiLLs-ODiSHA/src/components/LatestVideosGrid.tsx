import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import LazyImage from "@/components/LazyImage";

const LatestVideosGrid = () => {
  const { data: videos, isLoading, isError } = useYouTubeVideos(5);
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading latest videos...
        </span>
      </div>
    );
  }

  if (isError || !videos || videos.length === 0) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Unable to load latest YouTube videos right now. Please try again in a
        moment.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => (
        <article
          key={video.videoId}
          className="group overflow-hidden rounded-xl border border-border bg-card/70 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {playingId === video.videoId ? (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <button
                type="button"
                className="relative h-full w-full"
                onClick={() => setPlayingId(video.videoId)}
              >
                <LazyImage
                  src={video.thumbnail}
                  alt={video.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg transition-transform group-hover:scale-110">
                    <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
                  </div>
                </div>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 px-3 py-3 sm:px-4 sm:py-4">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {new Date(video.publishedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
};

export default LatestVideosGrid;

