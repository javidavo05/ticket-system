import { createServiceRoleClient } from '@/lib/supabase/server'
import { transitionTicket } from './state-machine'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import type { NextRequest } from 'next/server'

export interface TicketScanHistory {
  id: string
  ticketId: string
  scannedBy: string
  scannedByName: string | null
  scanMethod: string
  scanLocation: { lat: number; lng: number } | null
  isValid: boolean
  rejectionReason: string | null
  deviceInfo: any
  createdAt: string
}

/**
 * Manually validate a ticket (create a manual scan record)
 */
export async function manualValidateTicket(
  ticketId: string,
  validatorId: string,
  notes?: string,
  location?: { lat: number; lng: number },
  request?: NextRequest
): Promise<{
  success: boolean
  scanId: string
  message: string
}> {
  const supabase = await createServiceRoleClient()

  // Get ticket info
  const { data: ticketData, error: ticketError } = await (supabase
    .from('tickets')
    .select('id, ticket_number, status, event_id, scan_count, ticket_types!inner(is_multi_scan)')
    .eq('id', ticketId)
    .single() as any)

  if (ticketError || !ticketData) {
    throw new Error(`Ticket not found: ${ticketId}`)
  }

  const ticket = ticketData as any

  // Verify ticket is in a valid state for scanning
  if (ticket.status === TICKET_STATUS.REVOKED || ticket.status === TICKET_STATUS.REFUNDED) {
    throw new Error(`Ticket cannot be validated: ticket is ${ticket.status}`)
  }

  if (ticket.status === TICKET_STATUS.PENDING_PAYMENT) {
    throw new Error('Ticket cannot be validated: payment is pending')
  }

  // Get validator info
  const { data: validator } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('id', validatorId)
    .single()

  // Create manual scan record
  const scanLocation = location ? `(${location.lng},${location.lat})` : null

  const { data: scan, error: scanError } = await supabase
    .from('ticket_scans')
    .insert({
      ticket_id: ticketId,
      scanned_by: validatorId,
      scan_method: 'manual',
      scan_location: scanLocation,
      is_valid: true,
      rejection_reason: null,
      device_info: {
        validator: validator?.email || validatorId,
        notes: notes || null,
        manual: true,
      },
    })
    .select()
    .single()

  if (scanError) {
    throw new Error(`Failed to create scan record: ${scanError.message}`)
  }

  // Update ticket scan count and timestamps
  const now = new Date().toISOString()
  const updateData: {
    scan_count: number
    last_scan_at: string
    first_scan_at?: string
  } = {
    scan_count: ticket.scan_count + 1,
    last_scan_at: now,
  }

  if (ticket.scan_count === 0) {
    updateData.first_scan_at = now
  }

  const { error: updateError } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticketId)

  if (updateError) {
    console.error('Error updating ticket scan count:', updateError)
    // Don't fail the operation, but log the error
  }

  // Transition ticket state if needed (for single-use tickets)
  const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
  const isMultiScan = ticketType?.is_multi_scan || false

  if (!isMultiScan && ticket.status === TICKET_STATUS.PAID && ticket.scan_count === 0) {
    try {
      await transitionTicket(
        ticketId,
        TICKET_STATUS.USED,
        'Manual validation - first scan of single-use ticket',
        validatorId,
        request
      )
    } catch (error) {
      // Log but don't fail if state transition fails
      console.error('Error transitioning ticket state:', error)
    }
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: validatorId,
      action: 'ticket_manual_validation',
      resourceType: 'ticket',
      resourceId: ticketId,
      changes: {
        scanCount: ticket.scan_count + 1,
        notes: notes || null,
      },
      metadata: {
        ticketNumber: ticket.ticket_number,
        eventId: ticket.event_id,
        scanId: scan.id,
        manual: true,
      },
    },
    request
  )

  return {
    success: true,
    scanId: scan.id,
    message: 'Ticket validated successfully',
  }
}

/**
 * Get complete scan history for a ticket
 */
export async function getTicketScanHistory(ticketId: string): Promise<TicketScanHistory[]> {
  const supabase = await createServiceRoleClient()

  // Get all scans for this ticket
  const { data: scans, error: scansError } = await supabase
    .from('ticket_scans')
    .select(
      `
      id,
      ticket_id,
      scanned_by,
      scan_method,
      scan_location,
      is_valid,
      rejection_reason,
      device_info,
      created_at,
      users!ticket_scans_scanned_by_fkey(id, email, full_name)
    `
    )
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })

  if (scansError) {
    throw new Error(`Error fetching scan history: ${scansError.message}`)
  }

  // Transform results
  const history: TicketScanHistory[] =
    scans?.map((scan: any) => {
      const scanner = Array.isArray(scan.users) ? scan.users[0] : scan.users
      let scanLocation: { lat: number; lng: number } | null = null

      if (scan.scan_location) {
        // Parse POINT format: (lng, lat)
        const match = scan.scan_location.match(/\(([^,]+),([^)]+)\)/)
        if (match) {
          scanLocation = {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2]),
          }
        }
      }

      return {
        id: scan.id,
        ticketId: scan.ticket_id,
        scannedBy: scan.scanned_by,
        scannedByName: scanner?.full_name || scanner?.email || null,
        scanMethod: scan.scan_method,
        scanLocation,
        isValid: scan.is_valid,
        rejectionReason: scan.rejection_reason,
        deviceInfo: scan.device_info,
        createdAt: scan.created_at,
      }
    }) || []

  return history
}

