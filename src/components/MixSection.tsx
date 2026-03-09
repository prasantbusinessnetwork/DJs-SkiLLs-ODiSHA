import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MixCard from "./MixCard";
import SectionHeader from "./SectionHeader";

interface Mix {
  title: string;
  artist: string;
  tag: string;
  youtubeUrl: string;
  videoId: string;
  thumbnail: string;
  isNew?: boolean;
}

interface MixSectionProps {
  icon: string;
  title: string;
  mixes: Mix[];
}

const MixSection = ({ icon, title, mixes }: MixSectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  // Auto-slide effect
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 220, behavior: "smooth" });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  return (
    <section className="mb-12 sm:mb-16">
      <SectionHeader icon={icon} title={title} />
      <div className="relative group/section">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 sm:-left-4 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-lg backdrop-blur-sm transition-opacity hover:bg-card"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          id="youtube-videos"
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
        >
          {mixes.map((mix) => (
            <MixCard
              key={mix.videoId}
              title={mix.title}
              artist={mix.artist}
              tag={mix.tag}
              thumbnail={mix.thumbnail}
              youtubeUrl={mix.youtubeUrl}
              videoId={mix.videoId}
              isNew={mix.isNew}
            />
          ))}
        </div>

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 sm:-right-4 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-lg backdrop-blur-sm transition-opacity hover:bg-card"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};

export default MixSection;
