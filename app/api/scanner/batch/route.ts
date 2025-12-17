import { NextRequest, NextResponse } from 'next/server'
import { processScan } from '@/lib/services/tickets/scanning'
import { getCurrentUser } from '@/lib/auth/permissions'
import { deduplicateScans } from '@/lib/offline/conflict-resolution'
import type { QueuedScan } from '@/lib/offline/queue'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { scans } = body

    if (!Array.isArray(scans) || scans.length === 0) {
      return NextResponse.json({ success: false, message: 'Array de escaneos requerido' }, { status: 400 })
    }

    // Convert to QueuedScan format for deduplication
    const queuedScans: QueuedScan[] = scans.map((s: any) => ({
      id: s.scanId || `${Date.now()}-${Math.random()}`,
      qrSignature: s.qrSignature,
      scannerId: s.scannerId || user.id,
      location: s.location,
      timestamp: s.timestamp || new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      ticketId: s.ticketId,
    }))

    // Deduplicate scans
    const deduplicated = await deduplicateScans(queuedScans)

    // Process scans
    const results = []
    let successful = 0
    let failed = 0

    for (const scan of deduplicated) {
      try {
        const result = await processScan(
          scan.qrSignature,
          scan.scannerId,
          scan.location,
          request
        )

        results.push({
          scanId: scan.id,
          success: result.success,
          message: result.message,
          ticketId: result.ticketId,
          ticketNumber: result.ticketNumber,
          rejectionReason: result.rejectionReason,
        })

        if (result.success) {
          successful++
        } else {
          failed++
        }
      } catch (error: any) {
        results.push({
          scanId: scan.id,
          success: false,
          message: error.message || 'Error al procesar escaneo',
        })
        failed++
      }

      // Small delay to avoid overwhelming server
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    return NextResponse.json({
      success: true,
      total: deduplicated.length,
      successful,
      failed,
      results,
    })
  } catch (error: any) {
    console.error('Batch sync error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Error al sincronizar escaneos' },
      { status: 500 }
    )
  }
}

