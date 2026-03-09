import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBase() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  // Default fallback to the production Railway engine
  // This ensures the site works even if environment variables are not set in Vercel
  return "https://djs-skills-odisha-production.up.railway.app";
}
