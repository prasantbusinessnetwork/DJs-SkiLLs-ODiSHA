import { useState } from "react";
import { Play, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { getApiBase } from "../lib/utils";
import LazyImage from "./LazyImage";
import { toast } from "sonner";
import { fetchWithRetry } from "../utils/fetchWithRetry";

interface MixCardProps {
  title: string;
  artist: string;
  tag: string;
  thumbnail: string;
  youtubeUrl: string;
  isNew?: boolean;
  videoId?: string;
}

type DownloadState = "idle" | "downloading" | "success" | "error";

const MixCard = ({ title, artist, tag, thumbnail, youtubeUrl, isNew, videoId }: MixCardProps) => {
  const [playing, setPlaying] = useState(false);
  const [dlState, setDlState] = useState<DownloadState>("idle");

  // ── Download handler ─────────────────────────────────────────────────────
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoId || dlState === "downloading") return;

    setDlState("downloading");

    const apiBase = getApiBase();
    // Always send full YouTube URL so backend has no ambiguity
    const youtubeFullUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const downloadEndpoint = `${apiBase}/api/download?url=${encodeURIComponent(youtubeFullUrl)}&title=${encodeURIComponent(title || "audio")}`;

    try {
      console.log(`[MixCard] Download → ${downloadEndpoint}`);
      
      const res = await fetchWithRetry(downloadEndpoint, {}, 3, 30000); // Higher timeout for downloads
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server temporarily unavailable (HTTP ${res.status}). Please try again.` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = `${(title || "audio").replace(/[^\w\s-]/g, "_")}.mp3`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);

      setDlState("success");
      toast.success("Download complete!");
      setTimeout(() => setDlState("idle"), 5000);

    } catch (error: any) {
      console.error("[MixCard] Download failed:", error);
      setDlState("error");
      toast.error(`Download failed: ${error.message || "Please try again."}`);
      setTimeout(() => setDlState("idle"), 6000);
    }
  };

  const dlLabel =
    dlState === "downloading" ? "Downloading..." :
      dlState === "success" ? "Saved!" :
        dlState === "error" ? "Retry" :
          "Download";

  const dlIcon =
    dlState === "downloading" ? <Loader2 className="h-4 w-4 animate-spin" /> :
      dlState === "success" ? <CheckCircle className="h-4 w-4" /> :
        dlState === "error" ? <AlertCircle className="h-4 w-4" /> :
          <Download className="h-4 w-4" />;

  const handlePlay = () => {
    if (videoId) {
      setPlaying(true);
    } else {
      window.open(youtubeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="group w-[220px] sm:w-[280px] flex-shrink-0 cursor-pointer music-card-shadow">
      <div className="relative overflow-hidden rounded-xl aspect-video bg-zinc-900 border border-zinc-800">
        {playing && videoId ? (
          <iframe
            className="absolute inset-0 w-full h-full rounded-xl"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div onClick={handlePlay} className="h-full">
            <LazyImage
              src={thumbnail}
              alt={title}
              className="aspect-video w-full transition-transform duration-500 group-hover:scale-110 object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-2xl transition-transform hover:scale-110">
                <Play className="h-7 w-7 fill-current ml-1" />
              </div>
            </div>
          </div>
        )}

        {isNew && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive/90 px-3 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur-md z-10">
            NEW RELEASE
          </span>
        )}
      </div>

      <div className="mt-3 flex items-start justify-between px-1">
        <div className="min-w-0 flex-1" onClick={handlePlay}>
          <h4 className="truncate font-semibold text-sm text-foreground/90 leading-tight">{title}</h4>
          <p className="truncate text-[11px] text-muted-foreground mt-0.5">{artist}</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={!videoId || dlState === "downloading"}
          className={`flex-shrink-0 flex h-8 items-center gap-2 rounded-lg px-3 text-[11px] font-bold transition-all
            ${dlState === "success" ? "bg-emerald-600 text-white" :
              dlState === "error" ? "bg-zinc-700 text-white" :
                "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"}
            ${dlState === "downloading" ? "opacity-70 cursor-wait bg-zinc-800" : ""}
          `}
        >
          {dlIcon}
          <span className="hidden sm:inline">{dlLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default MixCard;
