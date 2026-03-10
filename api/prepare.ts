export default async function handler(req: any, res: any) {
  const { videoId, title } = req.query;
  const apiBase = process.env.VITE_API_BASE_URL || "https://djs-skills-odisha-production.up.railway.app";

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  // Use fetch to proxy the request to Railway and return JSON
  try {
    const targetUrl = `${apiBase}/api/prepare?videoId=${videoId}&title=${encodeURIComponent(title || "")}`;
    const response = await fetch(targetUrl);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to connect to download engine", message: error.message });
  }
}
