import { SignJWT, jwtVerify } from 'jose'
import { QR_CODE_EXPIRY_HOURS } from '@/lib/utils/constants'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

export interface QRPayload {
  ticketId: string
  eventId: string
  ticketNumber: string
  organizationId?: string // Optional for backward compatibility
  ticketTypeId?: string // Optional for backward compatibility
  issuedAt: number
  nonce: string
}

/**
 * Sign QR code payload with JWT
 */
export async function signQRCode(
  payload: Omit<QRPayload, 'issuedAt' | 'nonce'>
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomUUID()

  const jwtPayload: Record<string, any> = {
    ticketId: payload.ticketId,
    eventId: payload.eventId,
    ticketNumber: payload.ticketNumber,
    issuedAt: now,
    nonce,
  }

  // Add optional fields if present
  if (payload.organizationId) {
    jwtPayload.organizationId = payload.organizationId
  }
  if (payload.ticketTypeId) {
    jwtPayload.ticketTypeId = payload.ticketTypeId
  }

  const jwt = await new SignJWT(jwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + QR_CODE_EXPIRY_HOURS * 3600)
    .sign(JWT_SECRET)

  return jwt
}

/**
 * Verify QR code signature
 */
export async function verifyQRCode(signature: string): Promise<QRPayload> {
  try {
    const { payload } = await jwtVerify(signature, JWT_SECRET)
    
    const qrPayload: QRPayload = {
      ticketId: payload.ticketId as string,
      eventId: payload.eventId as string,
      ticketNumber: payload.ticketNumber as string,
      issuedAt: payload.issuedAt as number,
      nonce: payload.nonce as string,
    }

    // Add optional fields if present (for backward compatibility)
    if (payload.organizationId) {
      qrPayload.organizationId = payload.organizationId as string
    }
    if (payload.ticketTypeId) {
      qrPayload.ticketTypeId = payload.ticketTypeId as string
    }

    return qrPayload
  } catch (error) {
    throw new Error('Invalid QR code signature')
  }
}

/**
 * Generate idempotency key
 */
export function generateIdempotencyKey(): string {
  return `idemp_${Date.now()}_${crypto.randomUUID()}`
}

/**
 * Encrypt sensitive data (simple implementation - use proper encryption in production)
 */
export function encryptSensitiveData(data: string): string {
  // In production, use proper encryption like AES-256-GCM
  // This is a placeholder
  return Buffer.from(data).toString('base64')
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encrypted: string): string {
  // In production, use proper decryption
  // This is a placeholder
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}

