import { Play, Download } from "lucide-react";

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
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Open a popular YouTube to MP3 converter with the video URL
    const converterUrl = `https://www.y2mate.com/youtube-mp3/${videoId}`;
    window.open(converterUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-[200px] min-w-[200px] sm:w-[260px] sm:min-w-[260px] flex-shrink-0 cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={thumbnail}
          alt={title}
          className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-background/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-110">
            <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
          </div>
          <button
            onClick={handleDownload}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive shadow-lg transition-transform hover:scale-110"
            title="Download MP3"
          >
            <Download className="h-4 w-4 text-destructive-foreground" />
          </button>
        </div>
        {/* Tags */}
        {isNew && (
          <span className="absolute left-2 top-2 rounded bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
            NEW
          </span>
        )}
        <span className="absolute right-2 top-2 rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
          SKILL
        </span>
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
        >
          <Download className="h-3 w-3" />
          MP3
        </button>
      </div>
    </a>
  );
};

export default MixCard;
