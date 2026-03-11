import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Robust API Base URL Detection
 * 1. Checks VITE_API_BASE_URL (Defined in Vercel/Local env)
 * 2. Detects if running on localhost (Local development)
 * 3. Fallback to common Railway URL (Update this if your project slug changes)
 */
export function getApiBase() {
  // Priority 1: Use explicitly defined environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    let cleanUrl = envUrl.trim().replace(/\/$/, "");
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    return cleanUrl;
  }

  // Priority 2: Detect Local Development
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")) {
      return `http://${hostname}:3000`; // Standard local dev port
    }

    // Priority 3: Auto-detect if we're on a Vercel/Railway preview URL 
    // Usually, the API is on a similar domain or a subdomain
    if (hostname.includes("vercel.app")) {
      // Many people name their Railway project after the repo name
      return "https://djs-skills-odisha-production.up.railway.app";
    }
  }

  // Final Fallback (Railway Engine)
  return "https://djs-skills-odisha-production.up.railway.app";
}
