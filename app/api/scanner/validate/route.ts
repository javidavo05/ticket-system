import { NextRequest, NextResponse } from 'next/server'
import { processScan } from '@/lib/services/tickets/scanning'
import { getCurrentUser } from '@/lib/auth/permissions'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { qrSignature, scannerId, location } = body

    if (!qrSignature) {
      return NextResponse.json({ success: false, message: 'QR signature requerido' }, { status: 400 })
    }

    // Use provided scannerId or current user ID
    const finalScannerId = scannerId || user.id

    const result = await processScan(qrSignature, finalScannerId, location, request)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      ticketId: result.ticketId,
      ticketNumber: result.ticketNumber,
      eventId: result.eventId,
      scanCount: result.scanCount,
      rejectionReason: result.rejectionReason,
    })
  } catch (error: any) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Error al validar ticket' },
      { status: 500 }
    )
  }
}

