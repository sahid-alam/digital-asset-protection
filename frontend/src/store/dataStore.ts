/** 30-second in-memory cache to avoid redundant API calls across page navigations. */

const CACHE_TTL = 30_000

interface CacheEntry<T> {
  data: T
  ts: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() })
}

export function invalidate(key: string): void {
  store.delete(key)
}

export function invalidateAll(): void {
  store.clear()
}
