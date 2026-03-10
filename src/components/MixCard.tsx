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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoId || dlState === "preparing") return;

    const prepareUrl = `${apiBase}/api/prepare?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}`;
    const statusUrl = `${apiBase}/api/status?videoId=${encodeURIComponent(videoId)}`;
    const downloadUrl = `${apiBase}/api/download?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}`;

    setDlState("preparing");

    try {
      const res = await fetch(prepareUrl);
      if (!res.ok) throw new Error("Prepare failed");
      const data = await res.json();

      if (data.status === "ready") {
        // Already cached — download immediately
        setDlState("ready");
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", `${title}.mp3`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setDlState("idle"), 3000);
        return;
      }

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(statusUrl);
          if (!statusRes.ok) throw new Error("Status check failed");
          const statusData = await statusRes.json();

          if (statusData.status === "ready") {
            stopPolling();
            setDlState("ready");
            // Auto-trigger download immediately when ready
            const link = document.createElement("a");
            link.href = downloadUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => setDlState("idle"), 5000);
          } else if (statusData.status === "failed") {
            stopPolling();
            setDlState("failed");
            setTimeout(() => setDlState("idle"), 4000);
          }
        } catch {
          stopPolling();
          setDlState("failed");
          setTimeout(() => setDlState("idle"), 4000);
        }
      }, 2500);

    } catch {
      setDlState("failed");
      setTimeout(() => setDlState("idle"), 4000);
    }
  };

  const handleFinalDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = `${apiBase}/api/download?videoId=${encodeURIComponent(videoId || "")}&title=${encodeURIComponent(title)}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    // Removing custom 'download' attr to let server headers handle the filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDlState("idle");
  };

  const handlePlay = () => {
    if (videoId) {
      setPlaying(true);
    } else {
      window.open(youtubeUrl, "_blank", "noopener,noreferrer");
    }
  };

  const dlLabel =
    dlState === "preparing" ? "Preparing..." :
      dlState === "ready" ? "Done!" :
        dlState === "failed" ? "Failed" :
          "Download";

  const dlIcon =
    dlState === "preparing" ? <Loader2 className="h-3 w-3 animate-spin" /> :
      dlState === "ready" ? <CheckCircle className="h-3 w-3" /> :
        <Download className="h-3 w-3" />;

  return (
    <div className="group w-[200px] min-w-[200px] sm:w-[260px] sm:min-w-[260px] flex-shrink-0 cursor-pointer">
      <div className="relative overflow-hidden rounded-lg aspect-video">
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
          <div onClick={handlePlay}>
            <LazyImage
              src={thumbnail}
              alt={title}
              className="aspect-video w-full transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-background/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-110">
                <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
              </div>
            </div>
          </div>
        )}

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
          onClick={dlState === "ready" ? handleFinalDownload : handleDownload}
          disabled={!videoId || dlState === "preparing"}
          className={`mt-0.5 flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-bold transition-all
            ${dlState === "ready" ? "bg-green-600 text-white animate-pulse" :
              dlState === "failed" ? "bg-gray-500 text-white" :
                "bg-destructive text-destructive-foreground hover:opacity-80"}
            ${dlState === "preparing" ? "opacity-70 cursor-wait" : ""}
          `}
          title={dlState === "ready" ? "Click to save MP3" : "Prepare MP3"}
        >
          {dlIcon}
          {dlState === "ready" ? "Save MP3" : dlLabel}
        </button>
      </div>
    </div>
  );
};

export default MixCard;
