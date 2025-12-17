import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { initiateBinding, completeBinding, getBindingChallenge } from '@/lib/services/nfc/binding'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logAuditEvent } from '@/lib/security/audit'

const bindSchema = z.object({
  bandUid: z.string().min(1),
  challenge: z.string().optional(),
  response: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validated = bindSchema.parse(body)

    const supabase = await createServiceRoleClient()

    // Get band ID from UID
    const { data: bandData } = await supabase
      .from('nfc_bands')
      .select('id')
      .eq('band_uid', validated.bandUid)
      .single()

    if (!bandData) {
      return NextResponse.json(
        { error: 'NFC band not found' },
        { status: 404 }
      )
    }

    // Type assertion for band
    type NFCBandRow = {
      id: string
    }
    const band = bandData as unknown as NFCBandRow

    // If challenge and response provided, complete binding
    if (validated.challenge && validated.response) {
      const token = await completeBinding(band.id, validated.challenge, validated.response)

      await logAuditEvent(
        {
          userId: user.id,
          action: 'nfc_band_bound',
          resourceType: 'nfc_band',
          resourceId: band.id,
          metadata: {
            bandUid: validated.bandUid,
          },
        },
        request
      )

      return NextResponse.json({
        success: true,
        bandId: band.id,
        token,
      })
    }

    // Otherwise, initiate binding
    const challenge = await initiateBinding(validated.bandUid, user.id)

    await logAuditEvent(
      {
        userId: user.id,
        action: 'nfc_band_binding_initiated',
        resourceType: 'nfc_band',
        resourceId: band.id,
        metadata: {
          bandUid: validated.bandUid,
        },
      },
      request
    )

    return NextResponse.json({
      success: true,
      challenge,
      bandId: band.id,
    })
  } catch (error) {
    console.error('NFC bind error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to bind NFC band' },
      { status: 400 }
    )
  }
}
