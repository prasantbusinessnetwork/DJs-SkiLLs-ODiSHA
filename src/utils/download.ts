import { API_BASE } from "@/lib/config";
import { toast } from "sonner";

/**
 * Converts standard GitHub URL to raw URL for direct downloading
 */
function convertGithubUrl(url: string) {
  if (url.includes("github.com") && !url.includes("raw.githubusercontent.com")) {
    return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  }
  return url;
}

/**
 * Robust download function for MP3s
 * Works on Desktop, Android, and iOS
 * @param url The source URL (YouTube or direct MP3)
 * @param filename Desired filename
 */
export const downloadSong = (url: string, filename: string) => {
  if (!url) {
    toast.error("Invalid download URL");
    return;
  }

  const cleanUrl = convertGithubUrl(url);
  const toastId = toast.loading("Connecting to server...");

  try {
    // Construct API URL
    const apiUrl = `${API_BASE}/api/download?url=${encodeURIComponent(cleanUrl)}&title=${encodeURIComponent(filename || "audio")}`;

    // Create a hidden link and click it
    const link = document.createElement("a");
    link.href = apiUrl;
    link.setAttribute("download", `${(filename || "song").replace(/[^\w\s-]/gi, "").trim()}.mp3`);
    link.target = "_blank"; // Open in new tab for mobile stability
    link.rel = "noopener noreferrer";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.dismiss(toastId);
    toast.success("✅ Download started!");
  } catch (error) {
    console.error("[downloadSong] Error:", error);
    toast.dismiss(toastId);
    toast.error("❌ Download failed. Try again.");
  }
};
