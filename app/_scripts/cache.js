const cache = new Map();

export function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

export function setCached(key, value, ttlMs = 1000 * 60 * 60) { // 1 hour default
  cache.set(key, {
    value,
    expiry: Date.now() + ttlMs,
  });
}
