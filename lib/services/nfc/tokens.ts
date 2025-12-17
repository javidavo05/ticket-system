import { SignJWT, jwtVerify } from 'jose'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

// Default token expiration: 24 hours
const NFC_TOKEN_EXPIRY_HOURS = 24

export interface NFCTokenPayload {
  bandId: string
  userId: string
  eventId?: string
  issuedAt: number
  expiresAt?: number
  nonce: string
  bindingVerified: boolean
}

/**
 * Generate security token for NFC band
 * @param bandId - The NFC band ID
 * @param expiresInHours - Optional expiration in hours (default: 24)
 * @returns JWT token string
 */
export async function generateSecurityToken(
  bandId: string,
  expiresInHours: number = NFC_TOKEN_EXPIRY_HOURS
): Promise<string> {
  const supabase = await createServiceRoleClient()

  // Get band information
  const { data: band, error } = await (supabase
    .from('nfc_bands')
    .select('id, user_id, event_id, binding_verified_at')
    .eq('id', bandId)
    .single() as any)

  if (error || !band) {
    throw new NotFoundError('NFC band')
  }

  const bandData = band as any
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + expiresInHours * 3600
  const nonce = crypto.randomUUID()

  const payload: NFCTokenPayload = {
    bandId: bandData.id,
    userId: bandData.user_id,
    eventId: bandData.event_id || undefined,
    issuedAt: now,
    expiresAt,
    nonce,
    bindingVerified: !!bandData.binding_verified_at,
  }

  const jwt = await new SignJWT(payload as Record<string, any>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET)

  // Update band with token information
  await ((supabase
    .from('nfc_bands') as any)
    .update({
      security_token: jwt,
      token_issued_at: new Date().toISOString(),
      token_expires_at: new Date(expiresAt * 1000).toISOString(),
    })
    .eq('id', bandId))

  return jwt
}

/**
 * Verify and decode security token
 * @param token - JWT token string
 * @returns Decoded token payload
 */
export async function verifySecurityToken(token: string): Promise<NFCTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    const nfcPayload: NFCTokenPayload = {
      bandId: payload.bandId as string,
      userId: payload.userId as string,
      eventId: payload.eventId as string | undefined,
      issuedAt: payload.issuedAt as number,
      expiresAt: payload.expiresAt as number | undefined,
      nonce: payload.nonce as string,
      bindingVerified: payload.bindingVerified as boolean,
    }

    // Verify token matches stored token in database
    const supabase = await createServiceRoleClient()
    const { data: band } = await (supabase
      .from('nfc_bands')
      .select('security_token')
      .eq('id', nfcPayload.bandId)
      .single() as any)

    const bandData = band as any
    if (!bandData || bandData.security_token !== token) {
      throw new Error('Token does not match stored token')
    }

    return nfcPayload
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(`Invalid NFC token: ${error.message}`)
    }
    throw new ValidationError('Invalid NFC token')
  }
}

/**
 * Refresh expired security token
 * @param bandId - The NFC band ID
 * @returns New JWT token string
 */
export async function refreshSecurityToken(bandId: string): Promise<string> {
  const supabase = await createServiceRoleClient()

  // Check if band exists and is active
  const { data: band, error } = await (supabase
    .from('nfc_bands')
    .select('id, status')
    .eq('id', bandId)
    .single() as any)

  if (error || !band) {
    throw new NotFoundError('NFC band')
  }

  const bandData = band as any
  if (bandData.status !== 'active') {
    throw new ValidationError(`NFC band is ${bandData.status}`)
  }

  return generateSecurityToken(bandId)
}

/**
 * Verify binding challenge-response
 * @param bandId - The NFC band ID
 * @param challenge - Challenge string
 * @param response - Response string (should be HMAC of challenge with band secret)
 * @returns True if binding is verified
 */
export async function verifyBinding(
  bandId: string,
  challenge: string,
  response: string
): Promise<boolean> {
  const supabase = await createServiceRoleClient()

  // Get band information
  const { data: band, error } = await supabase
    .from('nfc_bands')
    .select('id, band_uid, user_id')
    .eq('id', bandId)
    .single()

  if (error || !band) {
    throw new NotFoundError('NFC band')
  }

  // Simple challenge-response verification
  // In production, use proper cryptographic verification
  // For now, we'll use a simple hash-based approach
  const expectedResponse = await generateChallengeResponse(band.band_uid, challenge)

  if (response !== expectedResponse) {
    return false
  }

  // Mark binding as verified
  await supabase
    .from('nfc_bands')
    .update({
      binding_verified_at: new Date().toISOString(),
    })
    .eq('id', bandId)

  return true
}

/**
 * Generate challenge response (for binding verification)
 * @param bandUid - The NFC band UID
 * @param challenge - Challenge string
 * @returns Response string
 */
async function generateChallengeResponse(bandUid: string, challenge: string): Promise<string> {
  // Simple implementation: HMAC of challenge with band UID
  // In production, use proper cryptographic primitives
  const encoder = new TextEncoder()
  const data = encoder.encode(`${bandUid}:${challenge}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a challenge for binding
 * @returns Challenge string
 */
export function generateBindingChallenge(): string {
  return crypto.randomUUID()
}
