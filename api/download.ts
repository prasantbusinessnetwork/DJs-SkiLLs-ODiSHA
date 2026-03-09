export default async function handler(req: any, res: any) {
  const { videoId, title } = req.query;
  const apiBase = process.env.VITE_API_BASE_URL;

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  // If a dedicated backend is configured, redirect to it
  if (apiBase && apiBase.trim().length > 0) {
    const targetUrl = `${apiBase.trim()}/api/download?videoId=${videoId}&title=${encodeURIComponent(title || "download")}`;
    return res.redirect(targetUrl);
  }

  // If no backend is configured, explain the situation instead of 404
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #111; color: #eee; height: 100vh;">
      <h1 style="color: #ff4d4d;">Download Engine Not Connected</h1>
      <p>The MP3 conversion engine needs to be deployed to Railway or Render to handle high-quality downloads.</p>
      <p>Please set the <b>VITE_API_BASE_URL</b> environment variable in Vercel settings.</p>
      <br>
      <a href="/" style="color: #fff; background: #ff4d4d; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Return to Home</a>
    </div>
  `);
}
