import { createServiceRoleClient } from '@/lib/supabase/server'
import { signQRCode } from '@/lib/security/crypto'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { randomBytes } from 'crypto'

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

  // Generate unique ticket number
  const ticketNumber = generateTicketNumber()

  // Create QR code signature
  const qrPayload = {
    ticketId: '', // Will be set after ticket creation
    eventId: params.eventId,
    ticketNumber,
  }

  // Sign QR code (ticketId will be updated after creation)
  const qrSignature = await signQRCode(qrPayload as any)

  // Create ticket record
  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      ticket_number: ticketNumber,
      ticket_type_id: params.ticketTypeId,
      event_id: params.eventId,
      purchaser_id: params.purchaserId || null,
      purchaser_email: params.purchaserEmail,
      purchaser_name: params.purchaserName,
      qr_signature: qrSignature,
      qr_payload: qrPayload,
      status: params.paymentId ? TICKET_STATUS.PAID : TICKET_STATUS.PENDING_PAYMENT,
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

  // Update QR signature with actual ticket ID
  const updatedQrPayload = {
    ticketId: ticket.id,
    eventId: params.eventId,
    ticketNumber,
  }

  const updatedQrSignature = await signQRCode(updatedQrPayload as any)

  // Update ticket with correct QR signature
  await supabase
    .from('tickets')
    .update({
      qr_signature: updatedQrSignature,
      qr_payload: updatedQrPayload,
    })
    .eq('id', ticket.id)

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

