import { Loader2, Search, ArrowLeft, Download, Play, CheckCircle } from "lucide-react";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LazyImage from "@/components/LazyImage";
import { getApiBase } from "@/lib/utils";
import { YouTubeVideo } from "@/lib/youtube";

type DownloadState = "idle" | "preparing" | "ready" | "failed";

interface VideoItemProps {
  video: YouTubeVideo;
}

const VideoItem = ({ video }: VideoItemProps) => {
  const [playing, setPlaying] = useState(false);
  const [dlState, setDlState] = useState<DownloadState>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiBase = getApiBase();

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const sanitize = (name: string) => {
    return (name || "download").replace(/[^\w\s-]/gi, '').trim() || "download";
  };

  const triggerBlobDownload = async () => {
    const downloadUrl = `${apiBase}/api/download?url=${encodeURIComponent(video.videoId)}&title=${encodeURIComponent(video.title)}`;

    setDlState("preparing");
    try {
      console.log(`[Frontend] Fetching audio from: ${downloadUrl}`);
      const response = await fetch(downloadUrl, {
        method: "GET",
        mode: "cors",
        credentials: "omit"
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: "Server could not process your download." }));
        throw new Error(errJson.error || "Download fail (HTTP " + response.status + ")");
      }

      const blob = await response.blob();

      if (blob.size < 1000) {
        throw new Error("Downloaded file is too small.");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      const safeTitle = (video.title || "audio").replace(/[^\w\s-]/g, "").trim() || "download";
      a.download = `${safeTitle}.mp3`;

      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);

      setDlState("ready");
      setTimeout(() => setDlState("idle"), 5000);
    } catch (err) {
      console.error("Download error:", err);
      setDlState("failed");
      setTimeout(() => setDlState("idle"), 4000);
    }
  };

  const handleDownload = async () => {
    if (dlState === "preparing") return;
    await triggerBlobDownload();
  };

  return (
    <article
      className="group overflow-hidden rounded-xl border border-border bg-card/70 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-destructive/60 hover:shadow-xl"
    >
      <div className="relative aspect-video">
        {playing ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="cursor-pointer h-full" onClick={() => setPlaying(true)}>
            <LazyImage
              src={video.thumbnail}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Play Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive shadow-lg transition-transform hover:scale-110">
                <Play className="h-5 w-5 fill-destructive-foreground text-destructive-foreground" />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-60" />
            <div className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
              {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }) : "RECENT"}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[0.9rem] font-semibold text-foreground">
              {video.title}
            </h2>
            <p className="mt-1 text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground">
              {video.artist}
            </p>
          </div>
          <span className="mt-0.5 rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            {video.tag}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between text-[0.7rem] text-muted-foreground">
          <div className="flex gap-2">
            <button
              onClick={() => window.open(video.youtubeUrl, "_blank", "noopener,noreferrer")}
              className="rounded-full bg-background/20 border border-white/10 px-3 py-1 text-[0.7rem] font-semibold text-foreground shadow-sm transition hover:bg-white/10"
            >
              Watch
            </button>
            <button
              onClick={dlState === "ready" ? async () => {
                await triggerBlobDownload();
                setDlState("idle");
              } : handleDownload}
              disabled={dlState === "preparing"}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-[0.7rem] font-bold transition-all hover:opacity-80
                ${dlState === "ready" ? "bg-green-600 text-white animate-pulse" :
                  dlState === "failed" ? "bg-gray-500 text-white" :
                    "bg-destructive text-destructive-foreground"}
                ${dlState === "preparing" ? "opacity-70 cursor-wait" : ""}
              `}
            >
              {dlState === "preparing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                dlState === "ready" ? <CheckCircle className="h-3.5 w-3.5" /> :
                  <Download className="h-3.5 w-3.5" />}
              {dlState === "preparing" ? "Preparing..." : dlState === "ready" ? "Save MP3" : dlState === "failed" ? "Failed" : "MP3"}
            </button>
          </div>
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground/80">
            FEEL THE <span className="text-destructive">FREQ</span>
          </span>
        </div>
      </div>
    </article>
  );
};

const AllVideos = () => {
  const { data: videos, isLoading, isError } = useYouTubeVideos(500);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredVideos = useMemo(() => {
    if (!videos) return [];
    const q = query.toLowerCase().trim();
    if (!q) return videos;
    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.artist.toLowerCase().includes(q) ||
        v.tag.toLowerCase().includes(q)
    );
  }, [videos, query]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-8 lg:px-16 xl:px-24">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition hover:border-foreground/40 hover:text-foreground hover:shadow-md"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground mb-2">
            Library
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            All <span className="text-destructive">Videos</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Browse every mix and upload from DJs SkiLLs ODiSHA in one clean, scrollable grid.
          </p>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, artist, tag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-border bg-card/60 px-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/60 focus-visible:ring-offset-0"
          />
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground text-sm">Loading all videos...</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Unable to load videos right now. Please try refreshing the page in a moment.
        </div>
      )}

      {!isLoading && filteredVideos.length === 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No videos match your search. Try a different keyword.
        </div>
      )}

      {filteredVideos.length > 0 && (
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVideos.map((video) => (
            <VideoItem key={video.videoId} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AllVideos;
