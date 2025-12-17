/**
 * Structured logging for theme system
 * Provides consistent logging format for failures, performance, and operations
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface ThemeLogContext {
  cacheKey?: string
  themeId?: string
  eventId?: string
  organizationId?: string
  source?: string
  [key: string]: unknown
}

/**
 * Log theme failure with structured context
 */
export function logThemeFailure(
  level: LogLevel,
  scenario: string,
  context: ThemeLogContext,
  recovery?: string
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    category: 'theme_failure',
    scenario,
    context,
    recovery,
  }

  // Use appropriate console method based on level
  switch (level) {
    case 'error':
      console.error('[Theme Failure]', JSON.stringify(logEntry, null, 2))
      break
    case 'warn':
      console.warn('[Theme Failure]', JSON.stringify(logEntry, null, 2))
      break
    case 'info':
      console.info('[Theme Failure]', JSON.stringify(logEntry, null, 2))
      break
    default:
      console.log('[Theme Failure]', JSON.stringify(logEntry, null, 2))
  }

  // In production, send to logging service (e.g., Sentry, DataDog)
  if (process.env.NODE_ENV === 'production' && level === 'error') {
    // TODO: Integrate with logging service
    // logToService(logEntry)
  }
}

/**
 * Log theme performance metrics
 */
export function logThemePerformance(
  operation: string,
  duration: number,
  cacheHit: boolean,
  context?: ThemeLogContext
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info' as LogLevel,
    category: 'theme_performance',
    operation,
    duration,
    durationMs: duration,
    cacheHit,
    context,
  }

  // Only log in development or if duration is high
  if (process.env.NODE_ENV === 'development' || duration > 200) {
    console.log('[Theme Performance]', JSON.stringify(logEntry, null, 2))
  }
}

/**
 * Log theme operation (info level)
 */
export function logThemeOperation(
  operation: string,
  context: ThemeLogContext
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info' as LogLevel,
    category: 'theme_operation',
    operation,
    context,
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Theme Operation]', JSON.stringify(logEntry, null, 2))
  }
}

/**
 * Log circuit breaker state change
 */
export function logCircuitBreakerState(
  state: 'closed' | 'open' | 'half-open',
  failureCount: number,
  context?: ThemeLogContext
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: state === 'open' ? 'error' : 'warn',
    category: 'circuit_breaker',
    state,
    failureCount,
    context,
  }

  console.warn('[Circuit Breaker]', JSON.stringify(logEntry, null, 2))
}

/**
 * Log cache operation
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'invalidate',
  cacheKey: string,
  context?: ThemeLogContext
): void {
  if (process.env.NODE_ENV === 'development') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug' as LogLevel,
      category: 'cache_operation',
      operation,
      cacheKey,
      context,
    }

    console.debug('[Cache]', JSON.stringify(logEntry, null, 2))
  }
}
