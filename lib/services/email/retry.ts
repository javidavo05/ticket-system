/**
 * Email Retry Strategy
 * Implements exponential backoff for email delivery retries
 */

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_BACKOFF_BASE_SECONDS = 60 // 1 minute

/**
 * Calculate the next retry time using exponential backoff
 * Schedule: 1min, 5min, 15min, 1h, 6h
 */
export function calculateNextRetry(attemptCount: number): Date {
  const baseSeconds = parseInt(process.env.EMAIL_RETRY_BACKOFF_BASE_SECONDS || String(DEFAULT_BACKOFF_BASE_SECONDS))
  
  // Exponential backoff: base * (3 ^ attemptCount)
  // Attempt 0: 1 minute (60s)
  // Attempt 1: 5 minutes (300s = 60 * 5)
  // Attempt 2: 15 minutes (900s = 60 * 15)
  // Attempt 3: 1 hour (3600s = 60 * 60)
  // Attempt 4: 6 hours (21600s = 60 * 360)
  
  const multipliers = [1, 5, 15, 60, 360] // minutes
  const multiplier = multipliers[Math.min(attemptCount, multipliers.length - 1)] || multipliers[multipliers.length - 1]
  
  const delaySeconds = baseSeconds * multiplier
  const nextRetry = new Date()
  nextRetry.setSeconds(nextRetry.getSeconds() + delaySeconds)
  
  return nextRetry
}

/**
 * Determine if an email should be retried based on error type and attempt count
 */
export function shouldRetry(
  attemptCount: number,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  lastError?: string
): boolean {
  // Check attempt limit
  if (attemptCount >= maxAttempts) {
    return false
  }

  // Check for permanent errors (don't retry)
  if (lastError) {
    const permanentErrors = [
      'invalid email',
      'email address does not exist',
      'recipient rejected',
      'bounced',
      'blocked',
      'spam',
      'invalid recipient',
    ]

    const errorLower = lastError.toLowerCase()
    for (const permanentError of permanentErrors) {
      if (errorLower.includes(permanentError)) {
        return false
      }
    }
  }

  return true
}

/**
 * Check if an error is permanent (should not retry)
 */
export function isPermanentError(error: string | Error): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorLower = errorMessage.toLowerCase()

  const permanentErrorPatterns = [
    'invalid email',
    'email address does not exist',
    'recipient rejected',
    'bounced',
    'blocked',
    'spam',
    'invalid recipient',
    'malformed',
    'syntax error',
  ]

  return permanentErrorPatterns.some((pattern) => errorLower.includes(pattern))
}

/**
 * Check if an error is a rate limit error (should retry with backoff)
 */
export function isRateLimitError(error: string | Error): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorLower = errorMessage.toLowerCase()

  const rateLimitPatterns = [
    'rate limit',
    'too many requests',
    'quota exceeded',
    'throttle',
    '429',
  ]

  return rateLimitPatterns.some((pattern) => errorLower.includes(pattern))
}

/**
 * Get error code from error message
 */
export function getErrorCode(error: string | Error): string {
  const errorMessage = typeof error === 'string' ? error : error.message

  if (isPermanentError(errorMessage)) {
    return 'PERMANENT_ERROR'
  }
  if (isRateLimitError(errorMessage)) {
    return 'RATE_LIMIT'
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
    return 'NETWORK_ERROR'
  }

  return 'UNKNOWN_ERROR'
}

