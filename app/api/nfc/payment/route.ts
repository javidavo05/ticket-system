import { NextRequest, NextResponse } from 'next/server'
import { validateNFCRequest } from '@/lib/services/nfc/validation'
import { processNFCPayment } from '@/lib/services/wallets/nfc'
import { z } from 'zod'

const paymentSchema = z.object({
  token: z.string().min(1),
  nonce: z.string().min(1),
  amount: z.number().positive(),
  eventId: z.string().uuid(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = paymentSchema.parse(body)

    // First validate the NFC request
    const validation = await validateNFCRequest(
      validated.token,
      validated.nonce,
      validated.eventId,
      undefined,
      validated.location
    )

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.reason,
          alerts: validation.alerts,
        },
        { status: 400 }
      )
    }

    if (!validation.bandId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Band ID not found in token',
        },
        { status: 400 }
      )
    }

    // Process payment
    // Note: We need to get band_uid from band_id, but for now we'll use a workaround
    // In production, you might want to pass band_uid or store it differently
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const supabase = await createServiceRoleClient()
    const { data: band } = await supabase
      .from('nfc_bands')
      .select('band_uid')
      .eq('id', validation.bandId)
      .single()

    if (!band) {
      return NextResponse.json(
        {
          success: false,
          error: 'NFC band not found',
        },
        { status: 404 }
      )
    }

    const result = await processNFCPayment(
      band.band_uid,
      validated.amount,
      validated.eventId,
      validated.token,
      validated.nonce,
      validated.location
    )

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      newBalance: result.newBalance,
    })
  } catch (error) {
    console.error('NFC payment error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to process NFC payment' },
      { status: 500 }
    )
  }
}
