import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateTicket } from './validation'
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

  // Validate ticket
  const validation = await validateTicket(qrSignature, scannerId)

  if (!validation.isValid) {
    // Record invalid scan
    await supabase.from('ticket_scans').insert({
      ticket_id: validation.ticketId,
      scanned_by: scannerId,
      scan_location: location ? `(${location.lng},${location.lat})` : null,
      scan_method: 'qr',
      is_valid: false,
      rejection_reason: validation.rejectionReason,
    })

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

  const { data: scan, error: scanError } = await supabase
    .from('ticket_scans')
    .insert({
      ticket_id: validation.ticketId,
      scanned_by: scannerId,
      scan_location: location ? `(${location.lng},${location.lat})` : null,
      scan_method: 'qr',
      is_valid: true,
    })
    .select()
    .single()

  if (scanError) {
    throw new Error(`Failed to record scan: ${scanError.message}`)
  }

  // Update ticket scan count and timestamps
  const updateData: {
    scan_count: number
    last_scan_at: string
    first_scan_at?: string
    status?: string
  } = {
    scan_count: validation.scanCount + 1,
    last_scan_at: now,
  }

  if (validation.scanCount === 0) {
    updateData.first_scan_at = now
    // Mark as used if single-scan ticket
    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('is_multi_scan')
      .eq('id', validation.ticketId)
      .single()

    if (ticketType && !ticketType.is_multi_scan) {
      updateData.status = TICKET_STATUS.USED
    }
  }

  const { error: updateError } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', validation.ticketId)

  if (updateError) {
    console.error('Error updating ticket:', updateError)
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

