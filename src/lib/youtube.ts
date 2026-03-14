const envApi = import.meta.env.VITE_API_URL;
let API = (envApi && envApi.trim() !== "") ? envApi.trim() : "https://djs-skills-odisha-production.up.railway.app";

// Ensure it's an absolute URL with protocol
if (API && !API.startsWith("http")) {
  API = `https://${API}`;
}
// Remove trailing slash if any
API = API.replace(/\/$/, "");
console.log(`[YouTube] Base API URL: ${API}`);

export interface YouTubeVideo {
  title: string;
  artist: string;
  tag: string;
  youtubeUrl: string;
  videoId: string;
  thumbnail: string;
  publishedAt: string;
}

export async function fetchLatestVideos(maxResults = 5): Promise<YouTubeVideo[]> {
  try {
    const fetchUrl = `${API}/api/latest`;
    console.log(`[YouTube] Fetching Latest: ${fetchUrl}`);
    const res = await fetch(fetchUrl);
    
    if (res.ok) {
      const data = await res.json();
      console.log(`[YouTube] Fetched ${data.length} latest videos`);
      return Array.isArray(data) ? data : [];
    } else {
      console.error(`[YouTube] Latest API Error: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error("Latest videos fetch failed:", e);
  }

  return [];
}

export async function fetchAllVideos(maxResults = 500): Promise<YouTubeVideo[]> {
  try {
    const fetchUrl = `${API}/api/videos`;
    console.log(`[YouTube] Fetching All: ${fetchUrl}`);
    const res = await fetch(fetchUrl);
    
    if (res.ok) {
      const data = await res.json();
      console.log(`[YouTube] Successfully fetched ${data.length} videos`);
      return Array.isArray(data) ? data : [];
    } else {
      console.error(`[YouTube] All Videos API Error: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.error("All videos fetch failed:", e);
  }

  return [];
}
