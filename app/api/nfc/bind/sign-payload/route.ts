import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const signPayloadSchema = z.object({
  token: z.string().min(1),
  bandUid: z.string().optional(),
})

/**
 * Sign NFC Payload
 * 
 * Generates a signed payload for writing to NFC tag.
 * Signature is generated server-side for security.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validated = signPayloadSchema.parse(body)

    const supabase = await createServiceRoleClient()

    // Validate binding token
    const { data: bindingTokenData, error: tokenError } = await supabase
      .from('binding_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', validated.token)
      .single()

    if (tokenError || !bindingTokenData) {
      return NextResponse.json(
        { error: 'Invalid binding token' },
        { status: 400 }
      )
    }

    // Type assertion after null check
    type BindingTokenRow = {
      id: string
      user_id: string
      expires_at: string
      used_at: string | null
    }
    const bindingToken = bindingTokenData as unknown as BindingTokenRow

    // Check if token is expired
    const expiresAt = new Date(bindingToken.expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Binding token expired' },
        { status: 400 }
      )
    }

    // Check if token was already used
    if (bindingToken.used_at) {
      return NextResponse.json(
        { error: 'Binding token already used' },
        { status: 400 }
      )
    }

    // Verify token belongs to authenticated user
    if (bindingToken.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Binding token does not belong to current user' },
        { status: 403 }
      )
    }

    // Get signing secret
    const signingSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-change-in-production'

    // Create payload (without signature)
    const payloadVersion = 0x01
    const payloadFlags = 0x00 // Unbound initially
    const payloadToken = validated.token
    const payloadExpiresAt = Math.floor(expiresAt.getTime() / 1000)

    // Create data to sign: version + flags + token + expiration
    const buffer = new ArrayBuffer(38) // 1 + 1 + 32 + 4
    const view = new DataView(buffer)

    view.setUint8(0, payloadVersion)
    view.setUint8(1, payloadFlags)

    // Token is base64, decode to bytes
    const tokenBytes = Buffer.from(payloadToken, 'base64')
    if (tokenBytes.length !== 32) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 400 }
      )
    }
    for (let i = 0; i < 32; i++) {
      view.setUint8(2 + i, tokenBytes[i])
    }

    view.setUint32(34, payloadExpiresAt, false) // big-endian

    // Generate HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', signingSecret)
    hmac.update(Buffer.from(buffer))
    const signature = hmac.digest('hex')

    // Return signed payload
    return NextResponse.json({
      success: true,
      payload: {
        version: payloadVersion,
        flags: payloadFlags,
        token: payloadToken,
        expiresAt: payloadExpiresAt,
        signature,
      },
    })
  } catch (error) {
    console.error('NFC sign payload error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to sign payload' },
      { status: 400 }
    )
  }
}
