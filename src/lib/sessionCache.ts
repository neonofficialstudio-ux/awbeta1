type CacheEntry<T> = { value: T; expiresAt: number };

const cache = new Map<string, CacheEntry<any>>();

export function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setToCache<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearSessionCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

/**
 * Helper padrão: se bypass=true, não usa cache e sobrescreve.
 */
export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  opts?: { bypass?: boolean },
): Promise<T> {
  if (!opts?.bypass) {
    const cached = getFromCache<T>(key);
    if (cached !== null) return cached;
  }
  const value = await fetcher();
  setToCache(key, value, ttlMs);
  return value;
}
