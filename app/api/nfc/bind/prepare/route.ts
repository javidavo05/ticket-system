import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/security/audit'
import crypto from 'crypto'

const prepareSchema = z.object({
  userId: z.string().uuid().optional(), // Optional, will use authenticated user if not provided
})

// Token expiration: 5 minutes
const TOKEN_EXPIRY_SECONDS = 5 * 60

/**
 * Prepare NFC binding
 * 
 * Generates a short-lived binding token for NFC tag binding.
 * Token expires in 5 minutes and can only be used once.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validated = prepareSchema.parse(body)

    // Use authenticated user ID (ignore provided userId for security)
    const userId = user.id

    const supabase = await createServiceRoleClient()

    // Generate cryptographically random 32-byte token
    const tokenBytes = crypto.randomBytes(32)
    const token = tokenBytes.toString('base64')

    // Calculate expiration
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000)

    // Store token in database
    const { data: bindingToken, error: insertError } = await supabase
      .from('binding_tokens')
      .insert({
        token,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !bindingToken) {
      console.error('Error storing binding token:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate binding token' },
        { status: 500 }
      )
    }

    // Log audit event
    await logAuditEvent(
      {
        userId,
        action: 'nfc_binding_token_generated',
        resourceType: 'binding_token',
        resourceId: bindingToken.id,
        metadata: {
          expiresAt: expiresAt.toISOString(),
        },
      },
      request
    )

    return NextResponse.json({
      success: true,
      token,
      expiresAt: Math.floor(expiresAt.getTime() / 1000), // Unix timestamp
      expiresIn: TOKEN_EXPIRY_SECONDS,
    })
  } catch (error) {
    console.error('NFC bind prepare error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to prepare binding' },
      { status: 400 }
    )
  }
}
