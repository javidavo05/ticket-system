import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifyQRCodeSignature } from './qr'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'

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

export async function validateTicket(
  qrSignature: string,
  scannerId?: string
): Promise<TicketValidationResult> {
  const supabase = await createServiceRoleClient()

  // Verify QR code signature
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

  // Fetch ticket from database
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_number,
      event_id,
      status,
      scan_count,
      ticket_types!inner (
        is_multi_scan,
        max_scans
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

  // Check ticket status
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

  if (ticket.status !== TICKET_STATUS.PAID) {
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

  // Check multi-scan limits
  const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
  if (ticketType && !ticketType.is_multi_scan && ticket.scan_count > 0) {
    return {
      isValid: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      eventId: ticket.event_id,
      status: ticket.status,
      scanCount: ticket.scan_count,
      maxScans: 1,
      rejectionReason: 'Ticket has already been scanned',
    }
  }

  if (ticketType?.max_scans && ticket.scan_count >= ticketType.max_scans) {
    return {
      isValid: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      eventId: ticket.event_id,
      status: ticket.status,
      scanCount: ticket.scan_count,
      maxScans: ticketType.max_scans,
      rejectionReason: `Ticket has reached maximum scan limit (${ticketType.max_scans})`,
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

