import { createServiceRoleClient } from '@/lib/supabase/server'
import { signQRCode } from '@/lib/security/crypto'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { randomBytes } from 'crypto'
import { verifyQRCode } from '@/lib/security/crypto'

export interface TicketGenerationParams {
  ticketTypeId: string
  eventId: string
  purchaserId?: string
  purchaserEmail: string
  purchaserName: string
  paymentId?: string
  promoterId?: string
  assignedToEmail?: string
  assignedToName?: string
}

export async function generateTicket(params: TicketGenerationParams): Promise<string> {
  const supabase = await createServiceRoleClient()

  // Get event to obtain organizationId
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', params.eventId)
    .single()

  if (eventError || !event) {
    throw new Error(`Failed to fetch event: ${eventError?.message}`)
  }

  // Generate unique ticket number
  const ticketNumber = generateTicketNumber()

  // Create ticket record first (we need the ticket ID for the QR payload)
  // Use ISSUED status for new tickets (will transition to PAID after payment)
  const initialStatus = params.paymentId ? TICKET_STATUS.PAID : TICKET_STATUS.ISSUED

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      ticket_number: ticketNumber,
      ticket_type_id: params.ticketTypeId,
      event_id: params.eventId,
      organization_id: event.organization_id,
      purchaser_id: params.purchaserId || null,
      purchaser_email: params.purchaserEmail,
      purchaser_name: params.purchaserName,
      qr_signature: '', // Will be set after QR generation
      qr_payload: {}, // Will be set after QR generation
      status: initialStatus,
      payment_id: params.paymentId || null,
      promoter_id: params.promoterId || null,
      assigned_to_email: params.assignedToEmail || null,
      assigned_to_name: params.assignedToName || null,
    })
    .select()
    .single()

  if (error || !ticket) {
    throw new Error(`Failed to create ticket: ${error?.message}`)
  }

  // Create QR payload with all required fields
  const qrPayload = {
    ticketId: ticket.id,
    eventId: params.eventId,
    ticketNumber,
    organizationId: event.organization_id || undefined,
    ticketTypeId: params.ticketTypeId,
  }

  // Sign QR code
  const qrSignature = await signQRCode(qrPayload)

  // Extract nonce from the signed QR (we need to verify it to get the nonce)
  let nonce: string
  try {
    const verified = await verifyQRCode(qrSignature)
    nonce = verified.nonce
  } catch (error) {
    throw new Error(`Failed to extract nonce from QR signature: ${error}`)
  }

  // Update ticket with QR signature and payload
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      qr_signature: qrSignature,
      qr_payload: qrPayload,
    })
    .eq('id', ticket.id)

  if (updateError) {
    throw new Error(`Failed to update ticket QR: ${updateError.message}`)
  }

  // Store nonce in ticket_nonces table for replay prevention
  const { error: nonceError } = await supabase.from('ticket_nonces').insert({
    ticket_id: ticket.id,
    nonce: nonce,
  })

  if (nonceError) {
    // Non-critical error, log but don't fail ticket creation
    console.error(`Failed to store nonce for ticket ${ticket.id}:`, nonceError)
  }

  return ticket.id
}

function generateTicketNumber(): string {
  // Format: EVENT-YYYYMMDD-XXXXXX
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = randomBytes(3).toString('hex').toUpperCase()
  return `TKT-${dateStr}-${random}`
}

export async function generateTickets(
  params: TicketGenerationParams,
  quantity: number
): Promise<string[]> {
  const ticketIds: string[] = []

  for (let i = 0; i < quantity; i++) {
    const ticketId = await generateTicket(params)
    ticketIds.push(ticketId)
  }

  return ticketIds
}

/**
 * Issue a ticket (create in ISSUED state, before payment)
 * This is useful for free tickets or tickets that will be paid later
 */
export async function issueTicket(params: TicketGenerationParams): Promise<string> {
  // Ensure no payment ID is set for issued tickets
  const issueParams = { ...params, paymentId: undefined }
  return generateTicket(issueParams)
}

