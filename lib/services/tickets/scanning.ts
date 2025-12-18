import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateTicketWithReplayPrevention } from './validation'
import { verifyQRCode } from '@/lib/security/crypto'
import { transitionTicket } from './state-machine'
import { logAuditEvent } from '@/lib/security/audit'
import { TICKET_STATUS } from '@/lib/utils/constants'
import type { NextRequest } from 'next/server'

export interface ScanResult {
  success: boolean
  ticketId: string
  ticketNumber: string
  eventId: string
  scanCount: number
  message: string
  rejectionReason?: string
}

export async function processScan(
  qrSignature: string,
  scannerId: string,
  location?: { lat: number; lng: number },
  request?: NextRequest
): Promise<ScanResult> {
  const supabase = await createServiceRoleClient()
  const scanTime = new Date()

  // Extract nonce from QR signature for tracking
  let nonce: string
  try {
    const payload = await verifyQRCode(qrSignature)
    nonce = payload.nonce
  } catch (error) {
    return {
      success: false,
      ticketId: '',
      ticketNumber: '',
      eventId: '',
      scanCount: 0,
      message: 'Invalid QR code signature',
      rejectionReason: 'Invalid QR code signature',
    }
  }

  // Validate ticket with replay prevention
  const validation = await validateTicketWithReplayPrevention(qrSignature, scannerId, scanTime)

  if (!validation.isValid) {
    // Record invalid scan (only if we have a ticket ID)
    if (validation.ticketId) {
      await ((supabase as any).from('ticket_scans').insert({
        ticket_id: validation.ticketId,
        scanned_by: scannerId,
        scan_location: location ? `(${location.lng},${location.lat})` : null,
        scan_method: 'qr',
        is_valid: false,
        rejection_reason: validation.rejectionReason,
      }))

      await logAuditEvent(
        {
          userId: scannerId,
          action: 'ticket_scan_failed',
          resourceType: 'ticket',
          resourceId: validation.ticketId,
          metadata: {
            reason: validation.rejectionReason,
            scanCount: validation.scanCount,
          },
        },
        request
      )
    }

    return {
      success: false,
      ticketId: validation.ticketId,
      ticketNumber: validation.ticketNumber,
      eventId: validation.eventId,
      scanCount: validation.scanCount,
      message: validation.rejectionReason || 'Invalid ticket',
      rejectionReason: validation.rejectionReason,
    }
  }

  // Record valid scan
  const now = new Date().toISOString()

  const { data: scan, error: scanError } = await ((supabase as any)
    .from('ticket_scans')
    .insert({
      ticket_id: validation.ticketId,
      scanned_by: scannerId,
      scan_location: location ? `(${location.lng},${location.lat})` : null,
      scan_method: 'qr',
      is_valid: true,
    })
    .select()
    .single())

  if (scanError) {
    throw new Error(`Failed to record scan: ${scanError.message}`)
  }

  // Mark nonce as used (link it to the scan)
  await supabase
    .from('ticket_nonces')
    .update({ scan_id: scan.id, used_at: now })
    .eq('ticket_id', validation.ticketId)
    .eq('nonce', nonce)
    .is('scan_id', null) // Only update if not already used

  // Update ticket scan count and timestamps
  const updateData: {
    scan_count: number
    last_scan_at: string
    first_scan_at?: string
  } = {
    scan_count: validation.scanCount + 1,
    last_scan_at: now,
  }

  if (validation.scanCount === 0) {
    updateData.first_scan_at = now
  }

  // Update ticket scan count
  const { error: updateError } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', validation.ticketId)

  if (updateError) {
    console.error('Error updating ticket:', updateError)
  }

  // Transition ticket state if needed (using state machine)
  // If this is the first scan and ticket is single-use, transition to USED
  if (validation.scanCount === 0) {
    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('is_multi_scan')
      .eq('id', validation.ticketId)
      .single()

    if (ticketType && !ticketType.is_multi_scan && validation.status === TICKET_STATUS.PAID) {
      try {
        await transitionTicket(validation.ticketId, TICKET_STATUS.USED, 'First scan of single-use ticket', scannerId, request)
      } catch (error) {
        // Log but don't fail the scan if state transition fails
        console.error('Error transitioning ticket state:', error)
      }
    }
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: scannerId,
      action: 'ticket_scanned',
      resourceType: 'ticket',
      resourceId: validation.ticketId,
      metadata: {
        scanCount: validation.scanCount + 1,
        location,
        nonce,
      },
    },
    request
  )

  return {
    success: true,
    ticketId: validation.ticketId,
    ticketNumber: validation.ticketNumber,
    eventId: validation.eventId,
    scanCount: validation.scanCount + 1,
    message: 'Ticket scanned successfully',
  }
}

