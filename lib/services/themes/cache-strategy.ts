import { unstable_cache } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Theme, ThemeResolutionContext } from './domain'
import { generateCacheTagsFromContext } from './domain'
import { cacheMutex } from './cache-stampede'
import { withCircuitBreaker } from './circuit-breaker'
import { trackThemeResolution, trackDBQuery } from './performance'
import { logCacheOperation, logThemeFailure } from './theme-logger'
import { recoverCache } from './cache-recovery'
import { validateCacheEntry } from './cache-recovery'

// Cache TTLs
const EDGE_CACHE_TTL = process.env.NODE_ENV === 'production' ? 3600 : 300 // 1 hour prod, 5 min dev
const STALE_WHILE_REVALIDATE_TTL = 86400 // 24 hours (stale content still usable)
const DB_CACHE_TTL = 1800 // 30 minutes
const MEMORY_CACHE_TTL = 300 // 5 minutes

// In-memory cache with stale-while-revalidate support
interface CacheEntry {
  theme: Theme
  expiresAt: number // When entry becomes invalid
  staleAt: number // When entry becomes stale but still usable
  revalidating?: Promise<Theme> // Ongoing revalidation promise
}

const memoryCache = new Map<string, CacheEntry>()

/**
 * Get cached theme from memory cache
 * Returns theme if fresh, null if expired
 * Exported for use in cache recovery
 */
export function getFromMemoryCache(cacheKey: string): Theme | null {
  const cached = memoryCache.get(cacheKey)
  if (!cached) {
    return null
  }

  const now = Date.now()

  // Entry is fresh
  if (cached.expiresAt > now) {
    logCacheOperation('hit', cacheKey, { layer: 'memory', state: 'fresh' })
    return cached.theme
  }

  // Entry is stale but usable (stale-while-revalidate)
  if (cached.staleAt > now) {
    logCacheOperation('hit', cacheKey, { layer: 'memory', state: 'stale' })
    // Trigger background revalidation if not already in progress
    if (!cached.revalidating) {
      // Revalidation will be handled by getCachedThemeWithSWR
    }
    return cached.theme
  }

  // Entry is completely expired
  memoryCache.delete(cacheKey)
  return null
}

/**
 * Set theme in memory cache with stale-while-revalidate support
 * Exported for use in cache recovery
 */
export function setInMemoryCache(cacheKey: string, theme: Theme): void {
  const now = Date.now()
  memoryCache.set(cacheKey, {
    theme,
    expiresAt: now + MEMORY_CACHE_TTL * 1000,
    staleAt: now + STALE_WHILE_REVALIDATE_TTL * 1000,
  })
  logCacheOperation('set', cacheKey, { layer: 'memory' })
}

/**
 * Get cached theme from database cache (optional layer)
 * In production, this could use Redis
 */
async function getFromDBCache(cacheKey: string): Promise<Theme | null> {
  // For now, we'll skip DB cache layer and go straight to database
  // In production with Redis, implement here
  return null
}

/**
 * Set theme in database cache
 */
async function setInDBCache(cacheKey: string, theme: Theme, tags: string[]): Promise<void> {
  // For now, we'll skip DB cache layer
  // In production with Redis, implement here
}

/**
 * Get cached theme using multi-layer strategy with stale-while-revalidate
 * Layer 1: Edge Cache (Next.js unstable_cache)
 * Layer 2: Database Cache (Redis - optional)
 * Layer 3: Memory Cache
 */
export async function getCachedTheme(
  cacheKey: string,
  tags: string[],
  fetchFn: () => Promise<Theme>
): Promise<Theme> {
  const startTime = Date.now()

  // Layer 3: Check memory cache first (fastest)
  const memoryCached = getFromMemoryCache(cacheKey)
  if (memoryCached) {
    const duration = Date.now() - startTime
    trackThemeResolution(cacheKey, true, duration)
    return memoryCached
  }

  // Use cache stampede protection
  const theme = await cacheMutex.acquire(cacheKey, async () => {
    try {
      // Layer 1: Check edge cache (Next.js unstable_cache)
      const edgeCached = await unstable_cache(
        async () => {
          // Layer 2: Check DB cache
          const dbCached = await getFromDBCache(cacheKey)
          if (dbCached) {
            // Validate cache entry
            if (validateCacheEntry(dbCached)) {
              setInMemoryCache(cacheKey, dbCached)
              return dbCached
            } else {
              logThemeFailure('warn', 'invalid_cache_entry', { cacheKey }, 'rebuilding')
            }
          }

          // Fetch from database with circuit breaker
          trackDBQuery()
          const fetchedTheme = await withCircuitBreaker(fetchFn)
          
          // Validate fetched theme
          if (!validateCacheEntry(fetchedTheme)) {
            throw new Error('Invalid theme structure from database')
          }
          
          // Store in all cache layers
          await setInDBCache(cacheKey, fetchedTheme, tags)
          setInMemoryCache(cacheKey, fetchedTheme)
          
          return fetchedTheme
        },
        [cacheKey],
        {
          tags,
          revalidate: EDGE_CACHE_TTL,
        }
      )()

      const duration = Date.now() - startTime
      trackThemeResolution(cacheKey, false, duration)
      return edgeCached
    } catch (error) {
      // Cache or fetch failed, try recovery
      logThemeFailure('error', 'cache_fetch_failed', {
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      }, 'attempting_recovery')

      const recovered = await recoverCache(cacheKey, fetchFn)
      const duration = Date.now() - startTime
      trackThemeResolution(cacheKey, false, duration)
      return recovered
    }
  })

  return theme
}

/**
 * Get cached theme with stale-while-revalidate
 * Returns stale cache immediately if available, triggers background revalidation
 */
export async function getCachedThemeWithSWR(
  cacheKey: string,
  tags: string[],
  fetchFn: () => Promise<Theme>
): Promise<Theme> {
  const startTime = Date.now()

  // Check memory cache
  const cached = memoryCache.get(cacheKey)
  const now = Date.now()

  if (cached) {
    // Fresh cache - return immediately
    if (cached.expiresAt > now) {
      const duration = Date.now() - startTime
      trackThemeResolution(cacheKey, true, duration)
      logCacheOperation('hit', cacheKey, { state: 'fresh' })
      return cached.theme
    }

    // Stale cache - return immediately and trigger background revalidation
    if (cached.staleAt > now) {
      const duration = Date.now() - startTime
      trackThemeResolution(cacheKey, true, duration)
      logCacheOperation('hit', cacheKey, { state: 'stale' })

      // Trigger background revalidation if not already in progress
      if (!cached.revalidating) {
        cached.revalidating = (async () => {
          try {
            const freshTheme = await getCachedTheme(cacheKey, tags, fetchFn)
            // Update cache entry
            const entry = memoryCache.get(cacheKey)
            if (entry) {
              entry.theme = freshTheme
              entry.expiresAt = now + MEMORY_CACHE_TTL * 1000
              entry.staleAt = now + STALE_WHILE_REVALIDATE_TTL * 1000
              entry.revalidating = undefined
            }
            return freshTheme
          } catch (error) {
            // Revalidation failed, but we already returned stale content
            logThemeFailure('warn', 'revalidation_failed', {
              cacheKey,
              error: error instanceof Error ? error.message : String(error),
            })
            const entry = memoryCache.get(cacheKey)
            if (entry) {
              entry.revalidating = undefined
            }
            return cached.theme
          }
        })()
      }

      return cached.theme
    }
  }

  // No cache or completely expired - fetch fresh
  return getCachedTheme(cacheKey, tags, fetchFn)
}

/**
 * Set cached theme in all layers
 */
export async function setCachedTheme(
  cacheKey: string,
  theme: Theme,
  tags: string[]
): Promise<void> {
  // Store in memory cache
  setInMemoryCache(cacheKey, theme)

  // Store in DB cache (if available)
  await setInDBCache(cacheKey, theme, tags)

  // Edge cache is handled by Next.js automatically via unstable_cache
}

/**
 * Invalidate theme cache by tags
 */
export async function invalidateThemeCache(tags: string[]): Promise<void> {
  // Invalidate memory cache entries that match tags
  for (const [key, value] of memoryCache.entries()) {
    // Simple tag matching - in production, maintain tag index
    const keyMatches = tags.some(tag => key.includes(tag.replace(':', '-')))
    if (keyMatches) {
      memoryCache.delete(key)
    }
  }

  // Invalidate edge cache using revalidateTag (Next.js)
  // Note: revalidateTag is available in Next.js 13.4+
  try {
    const { revalidateTag } = await import('next/cache')
    for (const tag of tags) {
      revalidateTag(tag)
    }
  } catch (error) {
    // revalidateTag might not be available in all Next.js versions
    console.warn('revalidateTag not available:', error)
  }

  // Invalidate DB cache (if using Redis)
  // await redisCache.invalidate(tags)
}

/**
 * Invalidate event theme cache
 */
export async function invalidateEventTheme(eventId: string): Promise<void> {
  await invalidateThemeCache([
    `event:${eventId}`,
    `theme:*`, // Invalidate all themes (could be more specific)
  ])
}

/**
 * Invalidate organization theme cache
 */
export async function invalidateOrganizationTheme(organizationId: string): Promise<void> {
  await invalidateThemeCache([
    `org:${organizationId}`,
    `org:${organizationId}:default`,
  ])
}

/**
 * Invalidate specific theme cache
 */
export async function invalidateTheme(themeId: string, version?: number): Promise<void> {
  const tags = [`theme:${themeId}`]
  if (version) {
    tags.push(`theme:${themeId}:v${version}`)
  }
  await invalidateThemeCache(tags)
}

/**
 * Clear all theme caches (use with caution)
 */
export function clearAllThemeCaches(): void {
  memoryCache.clear()
  // Edge cache and DB cache would need their own clear methods
}

/**
 * Generate cache key from context
 */
function generateCacheKeyFromContext(context: ThemeResolutionContext): string {
  const parts: string[] = []
  
  if (context.domain) {
    parts.push(`domain:${context.domain}`)
  }
  if (context.subdomain) {
    parts.push(`subdomain:${context.subdomain}`)
  }
  if (context.eventId) {
    parts.push(`event:${context.eventId}`)
  }
  if (context.organizationId) {
    parts.push(`org:${context.organizationId}`)
  }
  if (context.slug) {
    parts.push(`slug:${context.slug}`)
  }
  if (context.path) {
    parts.push(`path:${context.path}`)
  }
  
  return parts.join('|') || 'default'
}

/**
 * Get cached theme by domain
 * Uses stale-while-revalidate for better performance
 */
export async function getCachedThemeByDomain(
  domain: string,
  fetchFn: () => Promise<Theme>
): Promise<Theme> {
  const cacheKey = `domain:${domain}`
  const tags = [`domain:${domain}`]
  
  return getCachedThemeWithSWR(cacheKey, tags, fetchFn)
}

/**
 * Get cached theme by context (includes domain, subdomain, path, etc.)
 * Uses stale-while-revalidate for better performance
 */
export async function getCachedThemeByContext(
  context: ThemeResolutionContext,
  fetchFn: () => Promise<Theme>
): Promise<Theme> {
  const cacheKey = generateCacheKeyFromContext(context)
  const tags = generateCacheTagsFromContext(context)
  
  // Use SWR for better performance under high traffic
  return getCachedThemeWithSWR(cacheKey, tags, fetchFn)
}

/**
 * Invalidate domain theme cache
 */
export async function invalidateDomainTheme(domain: string): Promise<void> {
  await invalidateThemeCache([
    `domain:${domain}`,
    `subdomain:${domain.split('.')[0]}`,
  ])
}
