export default async function handler(req: any, res: any) {
  const { videoId, url, id, title } = req.query;
  const targetId = videoId || url || id;

  // Hardcoded Railway prod URL for permanent connection
  const apiBase = "https://djs-skills-odisha-production.up.railway.app";

  if (!targetId) {
    return res.status(400).json({ error: "Missing videoId, url, or id" });
  }

  // Redirect the browser to the dedicated Railway backend
  // This is a proxy to bypass Vercel's 10s execution limit
  const targetUrl = `${apiBase}/api/download?url=${encodeURIComponent(targetId)}&title=${encodeURIComponent(title || "download")}`;

  console.log(`[Vercel Proxy] Redirecting ${targetId} to ${targetUrl}`);
  return res.redirect(targetUrl);
}
