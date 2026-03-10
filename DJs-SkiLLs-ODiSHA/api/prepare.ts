/**
 * Vercel Serverless Function — /api/prepare
 *
 * Proxies the prepare request to the Railway/Antigravity backend.
 * The backend URL is kept server-side via VITE_API_BASE_URL.
 * This file runs on Vercel's edge — NOT in the browser.
 */

const BACKEND =
  process.env.VITE_API_BASE_URL?.trim() ||
  "https://djs-skills-odisha-production.up.railway.app";

export default async function handler(req: any, res: any) {
  const { videoId, title } = req.query;

  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "videoId is required" });
  }

  try {
    const target = `${BACKEND}/api/prepare?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title || "")}`;
    const upstream = await fetch(target, { signal: AbortSignal.timeout(8000) });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    console.error("[/api/prepare proxy error]", err.message);
    return res.status(502).json({ error: "Backend unreachable", message: err.message });
  }
}
