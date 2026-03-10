import { useState, useRef } from "react";
import { Play, Download, Loader2, CheckCircle } from "lucide-react";
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

type DownloadState = "idle" | "preparing" | "ready" | "failed";

const MixCard = ({ title, artist, tag, thumbnail, youtubeUrl, isNew, videoId }: MixCardProps) => {
  const [playing, setPlaying] = useState(false);
  const [dlState, setDlState] = useState<DownloadState>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiBase = getApiBase();

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Triggers a real file download — works on PC, Android & iOS
  const triggerActualDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${fileName}.mp3`);
    link.setAttribute("target", "_blank"); // needed on some mobile browsers
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlay = () => {
    if (videoId) {
      setPlaying(true);
    } else {
      window.open(youtubeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoId || dlState === "preparing") return;

    const prepareUrl = `${apiBase}/api/prepare?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}`;
    const statusUrl  = `${apiBase}/api/status?videoId=${encodeURIComponent(videoId)}`;
    const downloadUrl = `${apiBase}/api/download?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}`;

    setDlState("preparing");

    try {
      const res = await fetch(prepareUrl);
      if (!res.ok) throw new Error("Prepare request failed");
      const data = await res.json();

      // Already cached on server — download immediately
      if (data.status === "ready") {
        setDlState("ready");
        triggerActualDownload(downloadUrl, title);
        setTimeout(() => setDlState("idle"), 3000);
        return;
      }

      // Poll for completion
      const startTime = Date.now();
      pollRef.current = setInterval(async () => {
        // Give up after 3 minutes
        if (Date.now() - startTime > 180_000) {
          stopPolling();
          setDlState("failed");
          setTimeout(() => setDlState("idle"), 4000);
          return;
        }

        try {
          const statusRes = await fetch(statusUrl);
          const statusData = await statusRes.json();

          if (statusData.status === "ready") {
            stopPolling();
            setDlState("ready");
            triggerActualDownload(downloadUrl, title);
            setTimeout(() => setDlState("idle"), 3000);
          } else if (statusData.status === "failed") {
            stopPolling();
            setDlState("failed");
            setTimeout(() => setDlState("idle"), 4000);
          }
        } catch {
          // ignore transient network errors during polling
        }
      }, 2500);

    } catch (error) {
      console.error("Download flow failed:", error);
      setDlState("failed");
      setTimeout(() => setDlState("idle"), 4000);
    }
  };

  const dlLabel =
    dlState === "preparing" ? "Preparing..." :
    dlState === "ready"    ? "Ready!"       :
    dlState === "failed"   ? "Retry"        :
    "Download";

  const dlIcon =
    dlState === "preparing" ? <Loader2    className="h-3.5 w-3.5 animate-spin" /> :
    dlState === "ready"     ? <CheckCircle className="h-3.5 w-3.5" />            :
                              <Download   className="h-3.5 w-3.5" />;

  return (
    <div className="group w-[200px] min-w-[200px] sm:w-[260px] sm:min-w-[260px] flex-shrink-0 cursor-pointer animate-in fade-in zoom-in duration-500">
      {/* Thumbnail / Player */}
      <div className="relative overflow-hidden rounded-xl aspect-video shadow-2xl transition-all duration-300 group-hover:shadow-primary/20 group-hover:ring-1 group-hover:ring-primary/50">
        {playing && videoId ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div onClick={handlePlay} className="h-full w-full">
            <LazyImage
              src={thumbnail}
              alt={title}
              className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(255,0,0,0.5)] transition-transform hover:scale-110 active:scale-95">
                <Play className="h-6 w-6 fill-current ml-1" />
              </div>
            </div>
          </div>
        )}

        {isNew && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-destructive/90 px-3 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur-md animate-pulse">
            NEW RELEASE
          </span>
        )}
        <div className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md">
          HQ AUDIO
        </div>
      </div>

      {/* Info + Download */}
      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0 flex-1" onClick={handlePlay}>
          <h4 className="truncate font-display text-sm font-bold text-foreground leading-tight transition-colors group-hover:text-primary">
            {title}
          </h4>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground opacity-80">{artist}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-block rounded-md border border-white/5 bg-secondary/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              {tag}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[9px] font-medium uppercase tracking-tighter tabular-nums text-muted-foreground">192 KBPS</span>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={!videoId || dlState === "preparing"}
          className={[
            "mt-1 flex h-8 items-center gap-1.5 rounded-full px-4 text-[10px] font-black shadow-lg transition-all duration-300 active:scale-90",
            dlState === "ready"    ? "bg-emerald-500 text-white shadow-emerald-500/20"  : "",
            dlState === "failed"   ? "bg-amber-600 text-white"                           : "",
            dlState === "idle"     ? "bg-foreground text-background hover:bg-primary hover:text-white dark:hover:text-black" : "",
            dlState === "preparing"? "cursor-wait ring-1 ring-white/10 bg-muted-foreground/20 text-foreground" : "",
          ].join(" ")}
          title="Download MP3"
        >
          {dlIcon}
          <span className="hidden sm:inline">{dlLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default MixCard;
