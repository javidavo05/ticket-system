import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/permissions'
import { registerBand } from '@/lib/services/wallets/nfc'
import { nfcRegisterSchema } from '@/lib/utils/validation'
import { logAuditEvent } from '@/lib/security/audit'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const validated = nfcRegisterSchema.parse(body)

    const bandId = await registerBand(
      validated.bandUid,
      user.id,
      validated.eventId,
      user.id
    )

    await logAuditEvent({
      userId: user.id,
      action: 'nfc_band_registered',
      resourceType: 'nfc_band',
      resourceId: bandId,
      metadata: {
        bandUid: validated.bandUid,
        eventId: validated.eventId,
      },
    }, request)

    return NextResponse.json({
      success: true,
      bandId,
    })
  } catch (error) {
    console.error('NFC registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register NFC band' },
      { status: 400 }
    )
  }
}

