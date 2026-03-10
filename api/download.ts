export default async function handler(req: any, res: any) {
  const { videoId, title } = req.query;
  const apiBase = (process.env.VITE_API_BASE_URL || "https://djs-skills-odisha-production.up.railway.app").replace(/\/$/, "");

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  // Redirect to the dedicated backend for processing
  const targetUrl = `${apiBase}/api/download?videoId=${videoId}&title=${encodeURIComponent(title || "download")}`;
  return res.redirect(targetUrl);
}
