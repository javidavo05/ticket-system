/**
 * Performance monitoring for theme system
 * Tracks cache hit rates, DB queries, latency, and failure rates
 */

interface PerformanceMetrics {
  cacheHits: number
  cacheMisses: number
  dbQueries: number
  totalResolutions: number
  totalFailures: number
  totalLatency: number
  resolutions: Array<{ timestamp: number; duration: number; cacheHit: boolean }>
}

// In-memory metrics store
// In production, this could be sent to a metrics service
const metrics: PerformanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  dbQueries: 0,
  totalResolutions: 0,
  totalFailures: 0,
  totalLatency: 0,
  resolutions: [],
}

// Keep only last 1000 resolutions for rolling average
const MAX_RESOLUTIONS = 1000

/**
 * Track theme resolution performance
 */
export function trackThemeResolution(
  cacheKey: string,
  cacheHit: boolean,
  duration: number
): void {
  metrics.totalResolutions++
  metrics.totalLatency += duration

  if (cacheHit) {
    metrics.cacheHits++
  } else {
    metrics.cacheMisses++
  }

  // Store resolution for rolling average
  metrics.resolutions.push({
    timestamp: Date.now(),
    duration,
    cacheHit,
  })

  // Keep only recent resolutions
  if (metrics.resolutions.length > MAX_RESOLUTIONS) {
    metrics.resolutions.shift()
  }
}

/**
 * Track database query
 */
export function trackDBQuery(): void {
  metrics.dbQueries++
}

/**
 * Track theme failure
 */
export function trackThemeFailure(): void {
  metrics.totalFailures++
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): {
  cacheHitRate: number
  dbQueryCount: number
  averageLatency: number
  failureRate: number
  totalResolutions: number
  recentAverageLatency: number
} {
  const totalRequests = metrics.cacheHits + metrics.cacheMisses
  const cacheHitRate = totalRequests > 0 ? metrics.cacheHits / totalRequests : 0
  const averageLatency = metrics.totalResolutions > 0 
    ? metrics.totalLatency / metrics.totalResolutions 
    : 0
  const failureRate = metrics.totalResolutions > 0
    ? metrics.totalFailures / metrics.totalResolutions
    : 0

  // Calculate recent average (last 100 resolutions)
  const recentResolutions = metrics.resolutions.slice(-100)
  const recentAverageLatency = recentResolutions.length > 0
    ? recentResolutions.reduce((sum, r) => sum + r.duration, 0) / recentResolutions.length
    : 0

  return {
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    dbQueryCount: metrics.dbQueries,
    averageLatency: Math.round(averageLatency * 100) / 100,
    failureRate: Math.round(failureRate * 100) / 100,
    totalResolutions: metrics.totalResolutions,
    recentAverageLatency: Math.round(recentAverageLatency * 100) / 100,
  }
}

/**
 * Reset performance metrics (for testing)
 */
export function resetPerformanceMetrics(): void {
  metrics.cacheHits = 0
  metrics.cacheMisses = 0
  metrics.dbQueries = 0
  metrics.totalResolutions = 0
  metrics.totalFailures = 0
  metrics.totalLatency = 0
  metrics.resolutions = []
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  const total = metrics.cacheHits + metrics.cacheMisses
  return total > 0 ? metrics.cacheHits / total : 0
}

/**
 * Get failure rate
 */
export function getFailureRate(): number {
  return metrics.totalResolutions > 0
    ? metrics.totalFailures / metrics.totalResolutions
    : 0
}
