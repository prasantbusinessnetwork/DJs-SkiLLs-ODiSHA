/**
 * Vercel Serverless Function — /api/status
 *
 * Proxies the status-poll request to the Railway/Antigravity backend.
 */

const BACKEND =
  process.env.VITE_API_BASE_URL?.trim() ||
  "https://djs-skills-odisha-production.up.railway.app";

export default async function handler(req: any, res: any) {
  const { videoId } = req.query;

  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "videoId is required" });
  }

  try {
    const target = `${BACKEND}/api/status?videoId=${encodeURIComponent(videoId)}`;
    const upstream = await fetch(target, { signal: AbortSignal.timeout(5000) });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error("[/api/status proxy error]", err.message);
    return res.status(502).json({ error: "Backend unreachable", message: err.message });
  }
}
