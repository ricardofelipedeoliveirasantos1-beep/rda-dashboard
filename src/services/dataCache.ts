type Fetcher<T> = () => Promise<T>;

interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
  promise: Promise<T> | null;
}

const cache = new Map<string, CacheEntry<any>>();

export const CACHE_TTL = {
  players: 5 * 60 * 1000,
  matches: 3 * 60 * 1000,
  monthly_payments: 2 * 60 * 1000,
  expenses: 2 * 60 * 1000,
  notices: 1 * 60 * 1000,
  settings: 10 * 60 * 1000,
};

export async function getCachedData<T>(key: string, fetcher: Fetcher<T>, ttl: number): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry) {
    if (now - entry.timestamp < ttl) {
      if (entry.promise) return entry.promise;
      if (entry.data !== null) return entry.data;
    }
  }

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now(), promise: null });
      return data;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, { data: null, timestamp: now, promise });
  return promise;
}

export function invalidateCache(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearCache() {
  cache.clear();
}
