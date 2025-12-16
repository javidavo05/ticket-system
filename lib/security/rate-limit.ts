import { NextRequest } from 'next/server'

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

interface RateLimitConfig {
  requests: number
  window: number // seconds
}

export async function rateLimit(
  request: NextRequest,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const windowMs = config.window * 1000

  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetAt < now) {
      rateLimitStore.delete(k)
    }
  }

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetAt: now + windowMs,
    }
  }

  if (entry.count >= config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: config.requests - entry.count,
    resetAt: entry.resetAt,
  }
}

export function getRateLimitKey(request: NextRequest, prefix: string): string {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userId = request.headers.get('x-user-id') || 'anonymous'
  return `${prefix}:${userId}:${ip}`
}

