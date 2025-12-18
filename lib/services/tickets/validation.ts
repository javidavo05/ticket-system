import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyQRCodeSignature } from './qr'
import { verifyQRCode } from '@/lib/security/crypto'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { evaluateUsageRules, validateEventTimeRange, type EventData } from './usage-rules'
import { getUserOrganizationId } from '@/lib/supabase/rls'

export interface TicketValidationResult {
  isValid: boolean
  ticketId: string
  ticketNumber: string
  eventId: string
  status: string
  scanCount: number
  maxScans?: number
  rejectionReason?: string
}

/**
 * Validate ticket with replay attack prevention, usage rules, and multi-day support
 */
export async function validateTicketWithReplayPrevention(
  qrSignature: string,
  scannerId?: string,
  scanTime?: Date
): Promise<TicketValidationResult> {
  const supabase = await createServiceRoleClient()
  const now = scanTime || new Date()

  // Step 1: Verify QR code signature
  let payload
  try {
    payload = await verifyQRCodeSignature(qrSignature)
  } catch (error) {
    return {
      isValid: false,
      ticketId: '',
      ticketNumber: '',
      eventId: '',
      status: '',
      scanCount: 0,
      rejectionReason: 'Invalid QR code signature',
    }
  }

  // Step 2: Check replay attack - verify nonce hasn't been used
  const { data: existingNonceData } = await (supabase
    .from('ticket_nonces')
    .select('id, scan_id')
    .eq('ticket_id', payload.ticketId)
    .eq('nonce', payload.nonce)
    .single() as any)

  const existingNonce = existingNonceData as any

  if (existingNonce && existingNonce.scan_id) {
    return {
      isValid: false,
      ticketId: payload.ticketId,
      ticketNumber: payload.ticketNumber,
      eventId: payload.eventId,
      status: '',
      scanCount: 0,
      rejectionReason: 'QR code has already been scanned (replay attack detected)',
    }
  }

  // Step 3: Fetch ticket and related data
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      event_id,
      organization_id,
      ticket_type_id,
      status,
      scan_count,
      ticket_types!inner (
        id,
        is_multi_scan,
        max_scans
      ),
      events!inner (
        id,
        start_date,
        end_date,
        is_multi_day,
        organization_id
      )
    `)
    .eq('id', payload.ticketId)
    .eq('qr_signature', qrSignature)
    .single()

  if (error || !ticket) {
    return {
      isValid: false,
      ticketId: payload.ticketId,
      ticketNumber: payload.ticketNumber,
      eventId: payload.eventId,
      status: '',
      scanCount: 0,
      rejectionReason: 'Ticket not found',
    }
  }

  // Step 4: Validate organization context (if scanner is provided)
  if (scannerId && ticket.organization_id) {
    const scannerOrgId = await getUserOrganizationId(scannerId)
    if (scannerOrgId && scannerOrgId !== ticket.organization_id) {
      return {
        isValid: false,
        ticketId: ticket.id,
        ticketNumber: ticket.ticket_number,
        eventId: ticket.event_id,
        status: ticket.status,
        scanCount: ticket.scan_count,
        rejectionReason: 'Ticket does not belong to your organization',
      }
    }
  }

  // Step 5: Check ticket status
  if (ticket.status === TICKET_STATUS.REVOKED) {
    return {
      isValid: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      eventId: ticket.event_id,
      status: ticket.status,
      scanCount: ticket.scan_count,
      rejectionReason: 'Ticket has been revoked',
    }
  }

  if (ticket.status === TICKET_STATUS.REFUNDED) {
    return {
      isValid: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      eventId: ticket.event_id,
      status: ticket.status,
      scanCount: ticket.scan_count,
      rejectionReason: 'Ticket has been refunded',
    }
  }

  if (ticket.status !== TICKET_STATUS.PAID && ticket.status !== TICKET_STATUS.ISSUED) {
    return {
      isValid: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      eventId: ticket.event_id,
      status: ticket.status,
      scanCount: ticket.scan_count,
      rejectionReason: 'Ticket payment not completed',
    }
  }

  // Step 6: Validate event time range
  const eventData: EventData = {
    id: ticket.events.id,
    startDate: ticket.events.start_date,
    endDate: ticket.events.end_date,
    isMultiDay: ticket.events.is_multi_day,
    organizationId: ticket.events.organization_id,
  }

  const timeRangeResult = validateEventTimeRange(now, eventData)
  if (!timeRangeResult.isValid) {
    return {
      isValid: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      eventId: ticket.event_id,
      status: ticket.status,
      scanCount: ticket.scan_count,
      rejectionReason: timeRangeResult.reason || 'Event time validation failed',
    }
  }

  // Step 7: Evaluate ticket usage rules
  const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
  const rulesResult = await evaluateUsageRules(
    ticket.id,
    now,
    eventData,
    ticket.ticket_type_id,
    ticket.scan_count,
    ticketType?.max_scans,
    ticketType?.is_multi_scan
  )

  if (!rulesResult.isValid) {
    return {
      isValid: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      eventId: ticket.event_id,
      status: ticket.status,
      scanCount: ticket.scan_count,
      maxScans: ticketType?.max_scans,
      rejectionReason: rulesResult.reason || 'Ticket usage rule violation',
    }
  }

  return {
    isValid: true,
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
    eventId: ticket.event_id,
    status: ticket.status,
    scanCount: ticket.scan_count,
    maxScans: ticketType?.max_scans,
  }
}

/**
 * Legacy validateTicket function (for backward compatibility)
 * @deprecated Use validateTicketWithReplayPrevention instead
 */
export async function validateTicket(
  qrSignature: string,
  scannerId?: string
): Promise<TicketValidationResult> {
  return validateTicketWithReplayPrevention(qrSignature, scannerId)
}

