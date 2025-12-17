import type { Theme } from './domain'
import { getFromMemoryCache, setInMemoryCache } from './cache-strategy'
import { logCacheOperation, logThemeFailure } from './theme-logger'
import { withCircuitBreaker } from './circuit-breaker'
import { getDefaultSystemTheme } from './resolution'

/**
 * Recover from cache failures
 * Tries multiple fallback strategies before giving up
 */
export async function recoverCache(
  cacheKey: string,
  fetchFn: () => Promise<Theme>
): Promise<Theme> {
  // Strategy 1: Try memory cache
  try {
    const memoryCached = getFromMemoryCache(cacheKey)
    if (memoryCached) {
      logCacheOperation('hit', cacheKey, { source: 'memory_recovery' })
      return memoryCached
    }
  } catch (error) {
    logThemeFailure('warn', 'memory_cache_recovery_failed', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Strategy 2: Try to fetch from DB (with circuit breaker)
  try {
    const theme = await withCircuitBreaker(fetchFn)
    
    // Cache the recovered theme
    setInMemoryCache(cacheKey, theme)
    logCacheOperation('set', cacheKey, { source: 'db_recovery' })
    
    return theme
  } catch (error) {
    logThemeFailure('error', 'db_recovery_failed', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    })

    // Strategy 3: Use default theme as last resort
    const defaultTheme = await getDefaultSystemTheme()
    logThemeFailure('warn', 'using_default_theme', {
      cacheKey,
    }, 'emergency_fallback')
    
    return defaultTheme
  }
}

/**
 * Validate cache entry integrity
 */
export function validateCacheEntry(theme: Theme | null): boolean {
  if (!theme) {
    return false
  }

  // Check required fields
  if (!theme.id || !theme.name || !theme.config) {
    return false
  }

  // Check config structure
  if (typeof theme.config !== 'object') {
    return false
  }

  // Basic validation - config has required top-level keys
  const requiredKeys = ['colors', 'typography', 'spacing', 'layout', 'animations']
  for (const key of requiredKeys) {
    if (!(key in theme.config)) {
      return false
    }
  }

  return true
}

/**
 * Rebuild cache entry from database
 */
export async function rebuildCacheEntry(
  cacheKey: string,
  fetchFn: () => Promise<Theme>
): Promise<Theme> {
  try {
    const theme = await withCircuitBreaker(fetchFn)
    
    // Validate before caching
    if (!validateCacheEntry(theme)) {
      throw new Error('Invalid theme structure from database')
    }

    // Cache the rebuilt entry
    setInMemoryCache(cacheKey, theme)
    logCacheOperation('set', cacheKey, { source: 'rebuild' })
    
    return theme
  } catch (error) {
    logThemeFailure('error', 'cache_rebuild_failed', {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    })

    // Fallback to default
    const defaultTheme = await getDefaultSystemTheme()
    return defaultTheme
  }
}
