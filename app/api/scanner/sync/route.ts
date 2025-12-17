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
    const { qrSignature, scannerId, location, scanId } = body

    if (!qrSignature) {
      return NextResponse.json({ success: false, message: 'QR signature requerido' }, { status: 400 })
    }

    // Use provided scannerId or current user ID
    const finalScannerId = scannerId || user.id

    // Process scan (idempotent - can be called multiple times)
    const result = await processScan(qrSignature, finalScannerId, location, request)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      ticketId: result.ticketId,
      ticketNumber: result.ticketNumber,
      eventId: result.eventId,
      scanCount: result.scanCount,
      rejectionReason: result.rejectionReason,
      scanId, // Return local scan ID for tracking
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Error al sincronizar escaneo' },
      { status: 500 }
    )
  }
}

