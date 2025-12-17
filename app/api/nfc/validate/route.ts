import { NextRequest, NextResponse } from 'next/server'
import { validateNFCRequest } from '@/lib/services/nfc/validation'
import { z } from 'zod'

const validateSchema = z.object({
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
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = validateSchema.parse(body)

    const result = await validateNFCRequest(
      validated.token,
      validated.nonce,
      validated.eventId,
      validated.zoneId,
      validated.location
    )

    if (!result.valid) {
      return NextResponse.json(
        {
          valid: false,
          reason: result.reason,
          alerts: result.alerts,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      userId: result.userId,
      bandId: result.bandId,
      alerts: result.alerts,
      sessionToken: result.sessionToken,
    })
  } catch (error) {
    console.error('NFC validation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to validate NFC request' },
      { status: 500 }
    )
  }
}
