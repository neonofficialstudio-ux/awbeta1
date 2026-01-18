const cache = new Map<string, any>();

export async function cached<T>(key: string, fn: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && now - entry.time < ttlMs) {
    return entry.value;
  }

  const value = await fn();
  cache.set(key, { value, time: now });
  return value;
}

export function clearSessionCache() {
  cache.clear();
}
