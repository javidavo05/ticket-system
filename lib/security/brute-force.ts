import { NextRequest } from 'next/server'

// Simple in-memory brute force protection (use Redis in production)
const bruteForceStore = new Map<string, {
  attempts: number
  lockUntil: number
  lastAttempt: number
}>()

interface BruteForceConfig {
  maxAttempts: number
  lockoutDuration: number // seconds
  windowDuration: number // seconds - time window for counting attempts
}

const DEFAULT_CONFIG: BruteForceConfig = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60, // 15 minutes
  windowDuration: 60, // 1 minute
}

/**
 * Check if an IP or user is locked out due to brute force attempts
 */
export async function isBruteForceLocked(
  key: string,
  config: BruteForceConfig = DEFAULT_CONFIG
): Promise<{ locked: boolean; lockUntil?: number; remainingAttempts?: number }> {
  const now = Date.now()
  const entry = bruteForceStore.get(key)

  if (!entry) {
    return { locked: false, remainingAttempts: config.maxAttempts }
  }

  // Check if still locked
  if (entry.lockUntil > now) {
    return {
      locked: true,
      lockUntil: entry.lockUntil,
    }
  }

  // Check if attempts are within the time window
  const timeSinceLastAttempt = (now - entry.lastAttempt) / 1000
  if (timeSinceLastAttempt > config.windowDuration) {
    // Reset attempts if outside the window
    bruteForceStore.delete(key)
    return { locked: false, remainingAttempts: config.maxAttempts }
  }

  const remainingAttempts = Math.max(0, config.maxAttempts - entry.attempts)
  return {
    locked: entry.attempts >= config.maxAttempts,
    remainingAttempts,
  }
}

/**
 * Record a failed authentication attempt
 */
export async function recordFailedAttempt(
  key: string,
  config: BruteForceConfig = DEFAULT_CONFIG
): Promise<{ locked: boolean; lockUntil?: number; remainingAttempts: number }> {
  const now = Date.now()
  const entry = bruteForceStore.get(key)

  if (!entry || entry.lockUntil < now) {
    // New entry or lock expired
    const newEntry = {
      attempts: 1,
      lockUntil: 0,
      lastAttempt: now,
    }
    bruteForceStore.set(key, newEntry)
    return {
      locked: false,
      remainingAttempts: config.maxAttempts - 1,
    }
  }

  // Increment attempts
  entry.attempts++
  entry.lastAttempt = now

  // Lock if max attempts reached
  if (entry.attempts >= config.maxAttempts) {
    entry.lockUntil = now + (config.lockoutDuration * 1000)
  }

  bruteForceStore.set(key, entry)

  return {
    locked: entry.attempts >= config.maxAttempts,
    lockUntil: entry.lockUntil > now ? entry.lockUntil : undefined,
    remainingAttempts: Math.max(0, config.maxAttempts - entry.attempts),
  }
}

/**
 * Clear failed attempts for a key (on successful login)
 */
export async function clearFailedAttempts(key: string): Promise<void> {
  bruteForceStore.delete(key)
}

/**
 * Get brute force key from request (IP + optional user identifier)
 */
export function getBruteForceKey(
  request: NextRequest,
  identifier?: string
): string {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  // Create a hash-like key from IP and user agent
  const baseKey = `${ip}:${userAgent}`
  
  if (identifier) {
    return `${baseKey}:${identifier}`
  }
  
  return baseKey
}

/**
 * Clean up expired entries (should be called periodically)
 */
export function cleanupBruteForceStore(): void {
  const now = Date.now()
  for (const [key, entry] of bruteForceStore.entries()) {
    // Remove entries that are no longer locked and outside the time window
    if (entry.lockUntil < now) {
      const timeSinceLastAttempt = (now - entry.lastAttempt) / 1000
      if (timeSinceLastAttempt > DEFAULT_CONFIG.windowDuration) {
        bruteForceStore.delete(key)
      }
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupBruteForceStore, 5 * 60 * 1000)
}

