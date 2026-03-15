// Simple in-memory cache to reduce redundant lookups
export const cache = new Map();

export const getFromCache = (key) => cache.get(key);

export const setInCache = (key, value, ttlSeconds = 3600) => {
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttlSeconds * 1000); // clear after TTL
};
