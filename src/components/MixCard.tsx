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
    // Open reliable MP3 download converter
    const downloadUrl = `https://loader.to/api/button/?url=https://www.youtube.com/watch?v=${videoId}&f=mp3`;
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  const handlePlay = () => {
    // Open YouTube via openinapp link for mobile compatibility
    window.open("https://yt.openinapp.co/tqqna", "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="group w-[200px] min-w-[200px] sm:w-[260px] sm:min-w-[260px] flex-shrink-0 cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-lg" onClick={handlePlay}>
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
          title="Download Now"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      </div>
    </div>
  );
};

export default MixCard;
