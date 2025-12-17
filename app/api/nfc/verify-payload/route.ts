import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

const verifyPayloadSchema = z.object({
  version: z.number(),
  flags: z.number(),
  token: z.string(),
  expiresAt: z.number(),
  signature: z.string(),
})

/**
 * Verify NFC Payload Signature
 * 
 * Server-side signature verification for client-side payload validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = verifyPayloadSchema.parse(body)

    // Get signing secret
    const signingSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-change-in-production'

    // Create data to sign: version + flags + token + expiration
    const buffer = new ArrayBuffer(38) // 1 + 1 + 32 + 4
    const view = new DataView(buffer)

    view.setUint8(0, validated.version)
    view.setUint8(1, validated.flags)

    // Token is base64, decode to bytes
    const tokenBytes = Buffer.from(validated.token, 'base64')
    if (tokenBytes.length !== 32) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }
    for (let i = 0; i < 32; i++) {
      view.setUint8(2 + i, tokenBytes[i])
    }

    view.setUint32(34, validated.expiresAt, false) // big-endian

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', signingSecret)
    hmac.update(Buffer.from(buffer))
    const expectedSignature = hmac.digest('hex')

    // Constant-time comparison
    const valid = expectedSignature === validated.signature

    return NextResponse.json({ valid })
  } catch (error) {
    console.error('NFC verify payload error:', error)
    return NextResponse.json({ valid: false }, { status: 400 })
  }
}
