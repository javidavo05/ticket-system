import { addScanToQueue, getQueueStats } from '@/lib/offline/queue'
import { isOnline } from '@/lib/offline/sync'

export interface MobileValidationResult {
  success: boolean
  message: string
  queued: boolean
  scanId?: string
  ticketId?: string
  ticketNumber?: string
  eventId?: string
  scanCount?: number
  rejectionReason?: string
}

/**
 * Validate ticket for mobile (with offline support)
 */
export async function validateTicketMobile(
  qrSignature: string,
  scannerId: string,
  location?: { lat: number; lng: number }
): Promise<MobileValidationResult> {
  // Step 1: Basic local validation (format check)
  // Note: Full validation happens on server
  // Here we just check if it's a non-empty string
  if (!qrSignature || qrSignature.trim().length === 0) {
    return {
      success: false,
      message: 'Código QR inválido',
      queued: false,
      rejectionReason: 'Empty QR code',
    }
  }

  // Step 2: Check if online
  const online = isOnline()

  if (!online) {
    // Offline: Add to queue
    try {
      const scanId = await addScanToQueue({
        qrSignature,
        scannerId,
        location,
      })

      return {
        success: true,
        message: 'Escaneo guardado. Se sincronizará cuando haya conexión.',
        queued: true,
        scanId,
      }
    } catch (error: any) {
      return {
        success: false,
        message: 'Error al guardar escaneo offline',
        queued: false,
        rejectionReason: error.message,
      }
    }
  }

  // Online: Try immediate validation
  try {
    const response = await fetch('/api/scanner/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qrSignature,
        scannerId,
        location,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Validation failed' }))
      
      // If validation fails, still queue it for retry
      const scanId = await addScanToQueue({
        qrSignature,
        scannerId,
        location,
      })

      return {
        success: false,
        message: errorData.message || 'Error al validar ticket',
        queued: true,
        scanId,
        rejectionReason: errorData.message,
      }
    }

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        message: result.message || 'Ticket válido',
        queued: false,
        ticketId: result.ticketId,
        ticketNumber: result.ticketNumber,
        eventId: result.eventId,
        scanCount: result.scanCount,
      }
    } else {
      // Validation failed but we got a response - don't queue invalid tickets
      return {
        success: false,
        message: result.message || 'Ticket inválido',
        queued: false,
        rejectionReason: result.rejectionReason || result.message,
      }
    }
  } catch (error: any) {
    // Network error - queue for retry
    const scanId = await addScanToQueue({
      qrSignature,
      scannerId,
      location,
    })

    return {
      success: false,
      message: 'Error de conexión. Escaneo guardado para sincronizar.',
      queued: true,
      scanId,
      rejectionReason: error.message || 'Network error',
    }
  }
}

/**
 * Get queue statistics for mobile UI
 */
export async function getMobileQueueStats() {
  return await getQueueStats()
}

