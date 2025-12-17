import type { Theme } from './domain'

/**
 * Cache Stampede Protection
 * Prevents multiple concurrent requests for the same cache key
 * from hitting the database simultaneously
 */
class CacheMutex {
  private locks: Map<string, Promise<Theme>> = new Map()
  private readonly lockTimeout: number = 30000 // 30 seconds

  /**
   * Acquire a lock for a cache key
   * If a lock already exists, returns the existing promise
   * Otherwise, creates a new lock and executes fetchFn
   */
  async acquire(
    key: string,
    fetchFn: () => Promise<Theme>
  ): Promise<Theme> {
    // Check if lock already exists
    const existingLock = this.locks.get(key)
    if (existingLock) {
      // Another request is already fetching, wait for it
      try {
        return await existingLock
      } catch (error) {
        // If the existing lock fails, remove it and try again
        this.locks.delete(key)
        // Fall through to create new lock
      }
    }

    // Create new lock
    const lockPromise = this.executeWithTimeout(key, fetchFn)
    this.locks.set(key, lockPromise)

    try {
      const result = await lockPromise
      return result
    } finally {
      // Always release lock after completion
      this.locks.delete(key)
    }
  }

  /**
   * Execute fetch function with timeout
   */
  private async executeWithTimeout(
    key: string,
    fetchFn: () => Promise<Theme>
  ): Promise<Theme> {
    return Promise.race([
      fetchFn(),
      new Promise<Theme>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Lock timeout for key: ${key}`)),
          this.lockTimeout
        )
      ),
    ])
  }

  /**
   * Release a lock (usually not needed, locks auto-release)
   */
  release(key: string): void {
    this.locks.delete(key)
  }

  /**
   * Get current lock count (for monitoring)
   */
  getLockCount(): number {
    return this.locks.size
  }

  /**
   * Clear all locks (use with caution)
   */
  clear(): void {
    this.locks.clear()
  }
}

// Singleton instance
export const cacheMutex = new CacheMutex()
