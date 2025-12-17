import { createServiceRoleClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/utils/errors'
import { verifySecurityToken, type NFCTokenPayload } from './tokens'
import { detectCloning, startUsageSession } from './anti-cloning'

// Rate limiting defaults
const DEFAULT_MAX_REQUESTS = 10
const DEFAULT_WINDOW_SECONDS = 60

/**
 * Validate NFC token and nonce
 * @param token - JWT token string
 * @param nonce - Nonce string for replay prevention
 * @returns Token payload if valid
 */
export async function validateNFCToken(
  token: string,
  nonce: string
): Promise<NFCTokenPayload> {
  // Verify token
  const payload = await verifySecurityToken(token)

  // Check if nonce has been used
  const supabase = await createServiceRoleClient()
  const { data: existingNonce } = await supabase
    .from('nfc_nonces')
    .select('id')
    .eq('nfc_band_id', payload.bandId)
    .eq('nonce', nonce)
    .single()

  if (existingNonce) {
    throw new ValidationError('Nonce already used (replay attack detected)')
  }

  // Store nonce (will be linked to transaction later)
  await supabase.from('nfc_nonces').insert({
    nfc_band_id: payload.bandId,
    nonce,
  })

  return payload
}

/**
 * Check rate limit for NFC band
 * @param bandId - The NFC band ID
 * @returns True if within rate limit
 */
export async function checkRateLimit(bandId: string): Promise<{
  allowed: boolean
  remaining?: number
  resetAt?: Date
}> {
  const supabase = await createServiceRoleClient()
  const now = new Date()

  // Get or create rate limit record
  let { data: rateLimit } = await supabase
    .from('nfc_rate_limits')
    .select('*')
    .eq('nfc_band_id', bandId)
    .single()

  if (!rateLimit) {
    // Create default rate limit
    const { data: newRateLimit } = await supabase
      .from('nfc_rate_limits')
      .insert({
        nfc_band_id: bandId,
        window_start: now.toISOString(),
        request_count: 0,
        max_requests: DEFAULT_MAX_REQUESTS,
        window_duration_seconds: DEFAULT_WINDOW_SECONDS,
      })
      .select()
      .single()

    rateLimit = newRateLimit
  }

  if (!rateLimit) {
    throw new Error('Failed to get or create rate limit')
  }

  // Check if window has expired
  const windowStart = new Date(rateLimit.window_start as string)
  const windowDuration = rateLimit.window_duration_seconds as number
  const windowEnd = new Date(windowStart.getTime() + windowDuration * 1000)

  if (now > windowEnd) {
    // Reset window
    await supabase
      .from('nfc_rate_limits')
      .update({
        window_start: now.toISOString(),
        request_count: 0,
        updated_at: now.toISOString(),
      })
      .eq('id', rateLimit.id)

    return {
      allowed: true,
      remaining: rateLimit.max_requests as number,
      resetAt: new Date(now.getTime() + windowDuration * 1000),
    }
  }

  // Check if within limit
  const currentCount = rateLimit.request_count as number
  const maxRequests = rateLimit.max_requests as number

  if (currentCount >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowEnd,
    }
  }

  // Increment count
  await supabase
    .from('nfc_rate_limits')
    .update({
      request_count: currentCount + 1,
      updated_at: now.toISOString(),
    })
    .eq('id', rateLimit.id)

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
    resetAt: windowEnd,
  }
}

/**
 * Validate band access with full security checks
 * @param bandId - The NFC band ID
 * @param eventId - The event ID
 * @param zoneId - Optional zone ID
 * @param location - Optional location for cloning detection
 * @returns Validation result
 */
export async function validateBandAccess(
  bandId: string,
  eventId: string,
  zoneId?: string,
  location?: { lat: number; lng: number }
): Promise<{
  valid: boolean
  userId?: string
  reason?: string
  alerts?: string[]
  sessionToken?: string
}> {
  const supabase = await createServiceRoleClient()

  // Get band information
  const { data: band, error } = await supabase
    .from('nfc_bands')
    .select('id, user_id, status, event_id, binding_verified_at')
    .eq('id', bandId)
    .single()

  if (error || !band) {
    return {
      valid: false,
      reason: 'NFC band not found',
    }
  }

  // Check status
  if (band.status !== 'active') {
    return {
      valid: false,
      userId: band.user_id,
      reason: `NFC band is ${band.status}`,
    }
  }

  // Check binding verification
  if (!band.binding_verified_at) {
    return {
      valid: false,
      userId: band.user_id,
      reason: 'NFC band binding not verified',
    }
  }

  // Check event access
  if (band.event_id && band.event_id !== eventId) {
    return {
      valid: false,
      userId: band.user_id,
      reason: 'NFC band not valid for this event',
    }
  }

  // Check for cloning if location provided
  const alerts: string[] = []
  if (location) {
    const cloningCheck = await detectCloning(bandId, location)
    if (cloningCheck.isCloned) {
      return {
        valid: false,
        userId: band.user_id,
        reason: cloningCheck.reason || 'Cloning detected',
        alerts: cloningCheck.alerts,
      }
    }
    if (cloningCheck.alerts) {
      alerts.push(...cloningCheck.alerts)
    }
  }

  // Start usage session if location provided
  let sessionToken: string | undefined
  if (location) {
    try {
      sessionToken = await startUsageSession(bandId, location)
    } catch (error) {
      // Non-critical, log but continue
      console.error('Failed to start usage session:', error)
    }
  }

  return {
    valid: true,
    userId: band.user_id,
    alerts: alerts.length > 0 ? alerts : undefined,
    sessionToken,
  }
}

/**
 * Complete validation flow with token, nonce, rate limit, and access checks
 * @param token - JWT token string
 * @param nonce - Nonce string
 * @param eventId - Event ID
 * @param zoneId - Optional zone ID
 * @param location - Optional location
 * @returns Complete validation result
 */
export async function validateNFCRequest(
  token: string,
  nonce: string,
  eventId: string,
  zoneId?: string,
  location?: { lat: number; lng: number }
): Promise<{
  valid: boolean
  userId?: string
  bandId?: string
  reason?: string
  alerts?: string[]
  sessionToken?: string
}> {
  try {
    // Step 1: Validate token and nonce
    const payload = await validateNFCToken(token, nonce)

    // Step 2: Check rate limit
    const rateLimitCheck = await checkRateLimit(payload.bandId)
    if (!rateLimitCheck.allowed) {
      return {
        valid: false,
        userId: payload.userId,
        bandId: payload.bandId,
        reason: `Rate limit exceeded. Reset at ${rateLimitCheck.resetAt?.toISOString()}`,
      }
    }

    // Step 3: Validate band access
    const accessCheck = await validateBandAccess(
      payload.bandId,
      eventId,
      zoneId,
      location
    )

    if (!accessCheck.valid) {
      return {
        valid: false,
        userId: accessCheck.userId || payload.userId,
        bandId: payload.bandId,
        reason: accessCheck.reason,
        alerts: accessCheck.alerts,
      }
    }

    return {
      valid: true,
      userId: accessCheck.userId || payload.userId,
      bandId: payload.bandId,
      alerts: accessCheck.alerts,
      sessionToken: accessCheck.sessionToken,
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        valid: false,
        reason: error.message,
      }
    }
    throw error
  }
}
