async function fetchWithRetry(url: string, options: any = {}, retries = 3): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export default async function handler(req: any, res: any) {
  const { videoId } = req.query;
  const apiBase = (process.env.VITE_API_BASE_URL || process.env.VITE_API_URL || process.env.API_BASE_URL || "").replace(/\/$/, "");

  if (!videoId) {
    return res.status(400).json({ error: "Missing videoId" });
  }

  try {
    const targetUrl = `${apiBase}/api/status?videoId=${videoId}`;
    const response = await fetchWithRetry(targetUrl, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to connect to backend engine", message: error.message });
  }
}
