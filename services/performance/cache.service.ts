
// services/performance/cache.service.ts

interface CacheEntry {
  value: any;
  expiry: number;
}

const memoryCache = new Map<string, CacheEntry>();

export const CacheService = {
  /**
   * Retrieves a value from cache if it exists and hasn't expired.
   */
  get: <T>(key: string): T | null => {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      memoryCache.delete(key);
      return null;
    }

    return entry.value;
  },

  /**
   * Sets a value in the cache with a TTL (in milliseconds).
   */
  set: (key: string, value: any, ttlMs: number) => {
    memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  },

  /**
   * Clears a specific key or the entire cache.
   */
  invalidate: (key?: string) => {
    if (key) {
      memoryCache.delete(key);
    } else {
      memoryCache.clear();
    }
  },

  /**
   * Wrapper to get from cache or compute if missing/expired.
   * Acts as a 'read-through' cache.
   */
  remember: <T>(key: string, ttlMs: number, generator: () => T): T => {
    const cached = CacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = generator();
    CacheService.set(key, fresh, ttlMs);
    return fresh;
  },
  
  /**
   * Async version of remember
   */
  rememberAsync: async <T>(key: string, ttlMs: number, generator: () => Promise<T>): Promise<T> => {
      const cached = CacheService.get<T>(key);
      if (cached !== null) {
          return cached;
      }
      
      const fresh = await generator();
      CacheService.set(key, fresh, ttlMs);
      return fresh;
  }
};
