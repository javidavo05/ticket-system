/**
 * Circuit Breaker for Theme Database Operations
 * Protects against cascading failures when database is unavailable
 */

import { logCircuitBreakerState } from './theme-logger'

type CircuitState = 'closed' | 'open' | 'half-open'

interface CircuitBreakerConfig {
  failureThreshold: number // Open circuit after N failures
  successThreshold: number // Close circuit after N successes (half-open state)
  timeout: number // Time in ms before attempting recovery
  resetTimeout: number // Time in ms before resetting failure count
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes in half-open
  timeout: 60000, // 1 minute before attempting recovery
  resetTimeout: 300000, // 5 minutes before resetting failure count
}

class ThemeCircuitBreaker {
  private state: CircuitState = 'closed'
  private failureCount: number = 0
  private successCount: number = 0
  private lastFailureTime: number = 0
  private lastSuccessTime: number = 0
  private config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition
    this.updateState()

    // If circuit is open, throw error immediately
    if (this.state === 'open') {
      const error = new Error('Circuit breaker is open - database unavailable')
      error.name = 'CircuitBreakerOpenError'
      throw error
    }

    try {
      // Execute the function
      const result = await fn()

      // Record success
      this.onSuccess()

      return result
    } catch (error) {
      // Record failure
      this.onFailure()

      throw error
    }
  }

  /**
   * Update circuit state based on current conditions
   */
  private updateState(): void {
    const now = Date.now()

    // Reset failure count if enough time has passed
    if (
      this.failureCount > 0 &&
      now - this.lastFailureTime > this.config.resetTimeout
    ) {
      this.failureCount = 0
    }

    const previousState = this.state

    // Transition from open to half-open if timeout elapsed
    if (this.state === 'open') {
      if (now - this.lastFailureTime > this.config.timeout) {
        this.state = 'half-open'
        this.successCount = 0
      }
    }
    // Transition from half-open to closed if success threshold met
    else if (this.state === 'half-open') {
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed'
        this.failureCount = 0
        this.successCount = 0
      }
    }
    // Transition from closed to open if failure threshold met
    else if (this.state === 'closed') {
      if (this.failureCount >= this.config.failureThreshold) {
        this.state = 'open'
        this.lastFailureTime = now
      }
    }

    // Log state changes
    if (previousState !== this.state) {
      logCircuitBreakerState(this.state, this.failureCount)
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.lastSuccessTime = Date.now()

    if (this.state === 'half-open') {
      this.successCount++
    } else if (this.state === 'closed') {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1)
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.lastFailureTime = Date.now()
    this.failureCount++

    if (this.state === 'half-open') {
      // Failed in half-open, go back to open
      this.state = 'open'
      this.successCount = 0
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState()
    return this.state
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount
  }

  /**
   * Manually reset circuit breaker (use with caution)
   */
  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
    this.lastSuccessTime = 0
  }

  /**
   * Check if circuit is open (for monitoring)
   */
  isOpen(): boolean {
    this.updateState()
    return this.state === 'open'
  }
}

// Singleton instance for theme operations
export const themeCircuitBreaker = new ThemeCircuitBreaker()

/**
 * Execute database operation with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  fn: () => Promise<T>
): Promise<T> {
  return themeCircuitBreaker.execute(fn)
}
