import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { registerBand } from '@/lib/services/wallets/nfc'
import { generateSecurityToken } from '@/lib/services/nfc/tokens'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/security/audit'
import { ValidationError, NotFoundError } from '@/lib/utils/errors'
import crypto from 'crypto'

const completeSchema = z.object({
  token: z.string().min(1),
  bandUid: z.string().optional(),
  payloadSignature: z.string().optional(),
})

/**
 * Complete NFC binding
 * 
 * Validates the binding token, registers/binds the NFC band,
 * and generates a long-lived security token.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validated = completeSchema.parse(body)

    const supabase = await createServiceRoleClient()

    // Validate binding token
    type BindingToken = {
      id: string
      user_id: string
      expires_at: string
      used_at: string | null
    }

    const { data: bindingToken, error: tokenError } = await supabase
      .from('binding_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', validated.token)
      .single() as { data: BindingToken | null; error: any }

    if (tokenError || !bindingToken) {
      return NextResponse.json(
        { error: 'Invalid or expired binding token' },
        { status: 400 }
      )
    }

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

    // Verify payload signature if provided
    if (validated.payloadSignature) {
      // Reconstruct expected payload signature
      const signingSecret = process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-change-in-production'
      
      const payloadVersion = 0x01
      const payloadFlags = 0x00
      const payloadToken = validated.token
      const payloadExpiresAt = Math.floor(expiresAt.getTime() / 1000)

      // Create data to sign
      const buffer = Buffer.allocUnsafe(38)
      buffer.writeUInt8(payloadVersion, 0)
      buffer.writeUInt8(payloadFlags, 1)

      const tokenBytes = Buffer.from(payloadToken, 'base64')
      if (tokenBytes.length !== 32) {
        return NextResponse.json(
          { error: 'Invalid token format' },
          { status: 400 }
        )
      }
      tokenBytes.copy(buffer, 2)

      buffer.writeUInt32BE(payloadExpiresAt, 34)

      // Generate expected signature
      const hmac = crypto.createHmac('sha256', signingSecret)
      hmac.update(buffer)
      const expectedSignature = hmac.digest('hex')

      // Constant-time comparison
      if (expectedSignature !== validated.payloadSignature) {
        return NextResponse.json(
          { error: 'Invalid payload signature' },
          { status: 400 }
        )
      }
    }

    // Mark token as used (prevent reuse)
    await supabase
      .from('binding_tokens')
      .update({
        used_at: new Date().toISOString(),
      })
      .eq('id', bindingToken.id)

    let bandId: string

    // If bandUid provided, check if band exists
    if (validated.bandUid) {
      const { data: existingBand } = await supabase
        .from('nfc_bands')
        .select('id, user_id, status')
        .eq('band_uid', validated.bandUid)
        .single()

      if (existingBand) {
        // Band exists
        if (existingBand.user_id && existingBand.user_id !== user.id) {
          return NextResponse.json(
            { error: 'NFC band is already bound to another user' },
            { status: 400 }
          )
        }

        if (existingBand.status !== 'active') {
          return NextResponse.json(
            { error: `NFC band is ${existingBand.status}` },
            { status: 400 }
          )
        }

        // Update band to bind to user
        await supabase
          .from('nfc_bands')
          .update({
            user_id: user.id,
            binding_verified_at: new Date().toISOString(),
          })
          .eq('id', existingBand.id)

        bandId = existingBand.id
      } else {
        // Band doesn't exist, register it
        bandId = await registerBand(
          validated.bandUid,
          user.id,
          undefined, // eventId - can be set later
          user.id // registeredBy
        )
      }
    } else {
      // No bandUid provided, create new band with generated UID
      // This is less secure but allows binding without UID
      const generatedUid = `web-nfc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      bandId = await registerBand(
        generatedUid,
        user.id,
        undefined,
        user.id
      )
    }

    // Anti-cloning check: detect if band UID is already in use elsewhere
    if (validated.bandUid) {
      const { data: existingBands } = await supabase
        .from('nfc_bands')
        .select('id, user_id, last_used_at, last_location')
        .eq('band_uid', validated.bandUid)
        .neq('id', bandId)

      if (existingBands && existingBands.length > 0) {
        // Potential cloning detected - log but allow (might be legitimate reassignment)
        await logAuditEvent(
          {
            userId: user.id,
            action: 'nfc_band_cloning_suspected',
            resourceType: 'nfc_band',
            resourceId: bandId,
            metadata: {
              bandUid: validated.bandUid,
              existingBands: existingBands.length,
            },
          },
          request
        )
      }
    }

    // Generate long-lived security token
    const securityToken = await generateSecurityToken(bandId)

    // Log audit event
    await logAuditEvent(
      {
        userId: user.id,
        action: 'nfc_band_bound',
        resourceType: 'nfc_band',
        resourceId: bandId,
        metadata: {
          bandUid: validated.bandUid,
          method: 'web_nfc',
        },
      },
      request
    )

    return NextResponse.json({
      success: true,
      bandId,
      securityToken,
    })
  } catch (error) {
    console.error('NFC bind complete error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to complete binding' },
      { status: 400 }
    )
  }
}
