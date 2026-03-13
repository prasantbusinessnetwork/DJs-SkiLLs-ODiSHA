export default async function handler(req: any, res: any) {
  const { videoId, url, id, title } = req.query;
  const targetId = videoId || url || id;

  // Use env variable or fallback
  const apiBase = (process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "").replace(/\/$/, "");

  if (!targetId) {
    return res.status(400).json({ error: "Missing videoId, url, or id" });
  }

  // Redirect the browser to the dedicated Railway backend's download-mp3 endpoint
  if (!apiBase) {
    return res.status(500).json({ 
      error: "Backend URL not configured on Vercel", 
      message: "Please add VITE_API_BASE_URL to your Vercel environment variables." 
    });
  }

  const targetUrl = `${apiBase}/api/download-mp3?url=${encodeURIComponent(targetId)}&title=${encodeURIComponent(title || "download")}`;

  console.log(`[Vercel Proxy] Redirecting browser to: ${targetUrl}`);
  return res.redirect(targetUrl);
}
