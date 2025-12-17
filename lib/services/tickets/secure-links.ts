import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET || 'default-secret-change-in-production'
)

const DEFAULT_EXPIRY_DAYS = parseInt(process.env.TICKET_ACCESS_TOKEN_EXPIRY_DAYS || '30')

export interface TicketAccessTokenPayload {
  ticketId: string
  iat: number
  exp: number
}

/**
 * Generate a secure access token for viewing a ticket
 * Token is read-only and expires after configured days
 */
export async function generateTicketAccessToken(
  ticketId: string,
  expiresInDays?: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiryDays = expiresInDays || DEFAULT_EXPIRY_DAYS
  const exp = now + expiryDays * 24 * 60 * 60

  const jwt = await new SignJWT({
    ticketId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(JWT_SECRET)

  return jwt
}

/**
 * Verify and decode a ticket access token
 */
export async function verifyTicketAccessToken(
  token: string
): Promise<{ ticketId: string; valid: boolean; expired?: boolean }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    return {
      ticketId: payload.ticketId as string,
      valid: true,
    }
  } catch (error: any) {
    if (error.name === 'JWTExpired') {
      return {
        ticketId: '',
        valid: false,
        expired: true,
      }
    }

    return {
      ticketId: '',
      valid: false,
    }
  }
}

/**
 * Generate a secure URL for viewing a ticket
 */
export async function generateTicketUrl(ticketId: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
  const token = await generateTicketAccessToken(ticketId)
  
  return `${baseUrl}/tickets/${ticketId}?token=${encodeURIComponent(token)}`
}

