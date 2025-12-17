/**
 * Security utilities for theme resolution
 * Ensures themes are only resolved and served server-side
 */

/**
 * Assert that code is running server-side
 * Throws error if called in browser context
 */
export function assertServerSide(): void {
  if (typeof window !== 'undefined') {
    throw new Error('Theme resolution must be server-side only. This function cannot be called from the browser.')
  }
}

/**
 * Assert that code is running in Node.js environment
 */
export function assertNodeEnvironment(): void {
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('Theme resolution requires Node.js environment')
  }
}

/**
 * Create a server-only function wrapper
 * Returns a function that can only be called server-side
 */
export function createServerOnlyFunction<T extends (...args: any[]) => any>(
  fn: T
): T {
  return ((...args: Parameters<T>) => {
    assertServerSide()
    return fn(...args)
  }) as T
}

/**
 * Check if current execution is server-side
 */
export function isServerSide(): boolean {
  return typeof window === 'undefined'
}

/**
 * Security headers for theme API responses
 */
export interface ThemeSecurityHeaders {
  'Content-Security-Policy': string
  'X-Content-Type-Options': string
  'X-Frame-Options': string
  'X-XSS-Protection': string
}

/**
 * Get security headers for theme API responses
 */
export function getThemeSecurityHeaders(): ThemeSecurityHeaders {
  return {
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  }
}
