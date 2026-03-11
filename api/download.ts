export default async function handler(req: any, res: any) {
  const { videoId, title } = req.query;

  // Try to find the API base from env, otherwise fallback to the hardcoded Railway prod URL
  const apiBase = (process.env.VITE_API_BASE_URL || "https://djs-skills-odisha-production.up.railway.app").replace(/\/$/, "");

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  // Redirect the browser to the dedicated Railway backend
  // This is a proxy to bypass Vercel's 10s execution limit
  const targetUrl = `${apiBase}/api/download?videoId=${videoId}&title=${encodeURIComponent(title || "download")}`;

  console.log(`[Vercel Proxy] Redirecting ${videoId} to ${targetUrl}`);
  return res.redirect(targetUrl);
}
