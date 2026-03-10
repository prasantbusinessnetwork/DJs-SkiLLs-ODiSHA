/**
 * Vercel Serverless Function — /api/download
 *
 * Redirects to the Railway backend download endpoint.
 * A redirect (302) is used instead of a proxy so that the browser
 * opens a direct stream from Railway — this avoids Vercel's 10-second
 * function timeout and works correctly on all devices (PC, Android, iOS).
 */

const BACKEND =
  process.env.VITE_API_BASE_URL?.trim() ||
  "https://djs-skills-odisha-production.up.railway.app";

export default async function handler(req: any, res: any) {
  const { videoId, title } = req.query;

  if (!videoId || typeof videoId !== "string") {
    return res.status(400).json({ error: "videoId is required" });
  }

  // Redirect the browser directly to the backend download stream.
  // Using 302 means the browser follows the redirect and will show
  // the native "Save file" dialog on mobile and desktop.
  const target = `${BACKEND}/api/download?videoId=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title || "")}`;
  return res.redirect(302, target);
}
