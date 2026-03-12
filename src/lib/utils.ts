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
  return API_BASE.replace(/\/$/, "");
}
