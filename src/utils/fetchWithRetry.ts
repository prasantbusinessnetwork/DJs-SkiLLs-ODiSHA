/**
 * fetchWithRetry.ts
 * A robust fetch wrapper with retries and timeout protection.
 */

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  timeout: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok && retries > 0) {
      console.warn(`[fetch] Retrying ${url} (${retries} left) due to HTTP ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1, timeout);
    }

    return response;
  } catch (error: any) {
    clearTimeout(id);

    if (retries > 0 && error.name !== "AbortError") {
      console.warn(`[fetch] Retrying ${url} (${retries} left) due to error:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1, timeout);
    }

    throw error;
  }
}
