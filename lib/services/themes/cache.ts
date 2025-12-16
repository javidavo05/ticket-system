// Theme caching utilities
// In production, this should use Redis or similar distributed cache

export interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function get<T>(key: string): T | null {
  const entry = cache.get(key)
  
  if (!entry) {
    return null
  }

  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

export function set<T>(key: string, data: T, ttl: number = 300000): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  })
}

export function del(key: string): void {
  cache.delete(key)
}

export function clear(): void {
  cache.clear()
}

