const envApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
let api = (envApi && envApi.trim() !== "") ? envApi.trim() : "https://djs-skills-odisha-production.up.railway.app";

// Ensure it's an absolute URL with protocol
if (api && !api.startsWith("http")) {
  api = `https://${api}`;
}

// Remove trailing slash if any
api = api.replace(/\/$/, "");

export const API_BASE = api;
console.log(`[Config] API_BASE: ${API_BASE}`);
