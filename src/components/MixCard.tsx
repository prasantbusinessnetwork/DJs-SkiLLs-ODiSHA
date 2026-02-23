import { Play } from "lucide-react";

interface MixCardProps {
  title: string;
  artist: string;
  tag: string;
  thumbnail: string;
  youtubeUrl: string;
  isNew?: boolean;
}

const MixCard = ({ title, artist, tag, thumbnail, youtubeUrl, isNew }: MixCardProps) => {
  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-[260px] min-w-[260px] flex-shrink-0 cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-lg">
        <img
          src={thumbnail}
          alt={title}
          className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
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
      <div className="mt-2">
        <h4 className="truncate font-display text-sm font-bold text-foreground">{title}</h4>
        <p className="truncate text-xs text-muted-foreground">{artist}</p>
        <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {tag}
        </span>
      </div>
    </a>
  );
};

export default MixCard;
