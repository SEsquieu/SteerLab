type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheRecord<unknown>>();

export async function getOrLoad<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = memoryCache.get(key) as CacheRecord<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const value = await loader();

  memoryCache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });

  return value;
}

