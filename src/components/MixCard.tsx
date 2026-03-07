import { useState } from "react";
import { Play, Download } from "lucide-react";
import { getApiBase } from "../lib/utils";
import LazyImage from "./LazyImage";

interface MixCardProps {
  title: string;
  artist: string;
  tag: string;
  thumbnail: string;
  youtubeUrl: string;
  isNew?: boolean;
  videoId?: string;
}

const MixCard = ({ title, artist, tag, thumbnail, youtubeUrl, isNew, videoId }: MixCardProps) => {
  const [playing, setPlaying] = useState(false);
  const apiBase = getApiBase();

  // Mobile-safe download: use window.open with the API URL so the browser
  // handles the stream as a download (avoids the mobile anchor+download attribute
  // being blocked by YouTube's redirect).
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoId) return;
    const url = `${apiBase}/api/download?videoId=${encodeURIComponent(videoId)}`;
    // window.open triggers browser download manager on mobile; the _blank
    // target combined with correct Content-Disposition from the server handles it
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePlay = () => {
    if (videoId) {
      setPlaying(true);
    } else {
      window.open(youtubeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="group w-[200px] min-w-[200px] sm:w-[260px] sm:min-w-[260px] flex-shrink-0 cursor-pointer">
      <div className="relative overflow-hidden rounded-lg aspect-video">
        {playing && videoId ? (
          /* Inline lite-embed — iframe only created when user clicks Play */
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div onClick={handlePlay}>
            <LazyImage
              src={thumbnail}
              alt={title}
              className="aspect-video w-full transition-transform duration-300 group-hover:scale-105"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-background/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-110">
                <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {isNew && (
          <span className="absolute left-2 top-2 rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground z-10">
            NEW
          </span>
        )}
        <span className="absolute right-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground z-10">
          SKILL
        </span>
      </div>

      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1" onClick={handlePlay}>
          <h4 className="truncate font-display text-sm font-bold text-foreground">{title}</h4>
          <p className="truncate text-xs text-muted-foreground">{artist}</p>
          <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {tag}
          </span>
        </div>
        <button
          onClick={handleDownload}
          className="mt-0.5 flex h-7 items-center gap-1 rounded-full bg-destructive px-2.5 text-[10px] font-bold text-destructive-foreground transition-opacity hover:opacity-80"
          title="Download MP3"
          disabled={!videoId}
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      </div>
    </div>
  );
};

export default MixCard;
