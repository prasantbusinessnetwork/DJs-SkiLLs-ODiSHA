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
  // If we are on localhost, use the local backend port
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `http://${window.location.hostname}:3000`;
  }
  // On Vercel (or other production domains), use relative paths for API routes
  return "";
}
