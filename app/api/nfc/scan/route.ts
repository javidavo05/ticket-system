import { NextRequest, NextResponse } from 'next/server'
import { validateNFCRequest } from '@/lib/services/nfc/validation'
import { processNFCPayment } from '@/lib/services/wallets/nfc'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const scanSchema = z.object({
  token: z.string().min(1),
  nonce: z.string().min(1),
  eventId: z.string().uuid(),
  zoneId: z.string().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  scannerId: z.string().uuid(),
  operationType: z.enum(['access_control', 'payment']).optional(),
  amount: z.number().positive().optional(), // Required if operationType is 'payment'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = scanSchema.parse(body)

    // Validate operation type and required fields
    if (validated.operationType === 'payment' && !validated.amount) {
      return NextResponse.json(
        { error: 'Amount is required for payment operations' },
        { status: 400 }
      )
    }

    // Validate NFC request
    const validation = await validateNFCRequest(
      validated.token,
      validated.nonce,
      validated.eventId,
      validated.zoneId,
      validated.location
    )

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          reason: validation.reason,
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

    // Determine operation type if not specified
    const operationType = validated.operationType || 'access_control'

    if (operationType === 'payment' && validated.amount) {
      // Process payment
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

      const paymentResult = await processNFCPayment(
        band.band_uid,
        validated.amount,
        validated.eventId,
        validated.token,
        validated.nonce,
        validated.location
      )

      // Record access control transaction
      await supabase.from('nfc_transactions').insert({
        nfc_band_id: validation.bandId,
        user_id: validation.userId,
        event_id: validated.eventId,
        transaction_type: 'payment',
        amount: validated.amount.toFixed(2),
        zone_id: validated.zoneId || null,
      })

      return NextResponse.json({
        success: true,
        operationType: 'payment',
        valid: true,
        userId: validation.userId,
        transactionId: paymentResult.transactionId,
        newBalance: paymentResult.newBalance,
        sessionToken: validation.sessionToken,
        alerts: validation.alerts,
      })
    } else {
      // Access control only
      const supabase = await createServiceRoleClient()
      await supabase.from('nfc_transactions').insert({
        nfc_band_id: validation.bandId,
        user_id: validation.userId,
        event_id: validated.eventId,
        transaction_type: 'access_control',
        zone_id: validated.zoneId || null,
      })

      return NextResponse.json({
        success: true,
        operationType: 'access_control',
        valid: true,
        userId: validation.userId,
        sessionToken: validation.sessionToken,
        alerts: validation.alerts,
      })
    }
  } catch (error) {
    console.error('NFC scan error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to process NFC scan' },
      { status: 500 }
    )
  }
}
