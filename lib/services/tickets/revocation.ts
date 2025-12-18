import { createServiceRoleClient } from '@/lib/supabase/server'
import { transitionTicket, transitionTickets } from './state-machine'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import type { NextRequest } from 'next/server'

/**
 * Revoke a single ticket
 */
export async function revokeTicket(
  ticketId: string,
  reason: string,
  revokedBy: string,
  request?: NextRequest
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get ticket info for validation
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('id, ticket_number, status, event_id, organization_id')
    .eq('id', ticketId)
    .single()

  if (fetchError || !ticket) {
    throw new Error(`Ticket not found: ${ticketId}`)
  }

  // Transition to revoked state (state machine will validate)
  await transitionTicket(ticketId, TICKET_STATUS.REVOKED, reason, revokedBy, request)

  // Optionally invalidate all nonces for this ticket
  // This prevents any pending QR codes from being used
  // Note: We don't delete them, just mark them as used if they haven't been used yet
  // Actually, nonces are only marked as used when a scan happens, so we can leave them
  // The validation will check the ticket status anyway
}

/**
 * Revoke multiple tickets (e.g., for a refund)
 */
export async function revokeTicketsByPayment(
  paymentId: string,
  reason: string,
  revokedBy: string,
  request?: NextRequest
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get all tickets for this payment
  const { data: tickets, error: fetchError } = await supabase
    .from('tickets')
    .select('id, ticket_number, status')
    .eq('payment_id', paymentId)

  if (fetchError) {
    throw new Error(`Failed to fetch tickets: ${fetchError.message}`)
  }

  if (!tickets || tickets.length === 0) {
    return // No tickets to revoke
  }

  const ticketsData = tickets as any[]
  const ticketIds = ticketsData.map((t: any) => t.id)

  // Transition all tickets to revoked state
  await transitionTickets(ticketIds, TICKET_STATUS.REVOKED, reason, revokedBy, request)
}

/**
 * Revoke tickets by event (admin function)
 */
export async function revokeTicketsByEvent(
  eventId: string,
  reason: string,
  revokedBy: string,
  request?: NextRequest
): Promise<number> {
  const supabase = await createServiceRoleClient()

  // Get all tickets for this event that are not already terminal
  const { data: tickets, error: fetchError } = await supabase
    .from('tickets')
    .select('id')
    .eq('event_id', eventId)
    .not('status', 'in', `(${TICKET_STATUS.REVOKED},${TICKET_STATUS.REFUNDED})`)

  if (fetchError) {
    throw new Error(`Failed to fetch tickets: ${fetchError.message}`)
  }

  if (!tickets || tickets.length === 0) {
    return 0 // No tickets to revoke
  }

  const ticketIds = tickets.map((t) => t.id)

  // Transition all tickets to revoked state
  await transitionTickets(ticketIds, TICKET_STATUS.REVOKED, reason, revokedBy, request)

  return ticketIds.length
}

/**
 * Check if a ticket can be revoked
 */
export async function canRevokeTicket(ticketId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('status')
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    return false
  }

  // Can revoke if not already in terminal state
  return (
    ticket.status !== TICKET_STATUS.REVOKED &&
    ticket.status !== TICKET_STATUS.REFUNDED
  )
}

