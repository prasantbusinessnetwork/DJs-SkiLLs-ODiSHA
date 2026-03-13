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
import { API_BASE } from "./config";

export function getApiBase() {
  // If env vars are missing, fallback to the known production URL to avoid relative path's 404
  const base = API_BASE || "https://djs-skills-odisha-production.up.railway.app";
  return base.replace(/\/$/, "");
}
