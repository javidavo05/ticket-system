import { createServiceRoleClient } from '@/lib/supabase/server'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import type { NextRequest } from 'next/server'

/**
 * Valid state transitions for tickets
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  [TICKET_STATUS.PENDING_PAYMENT]: [TICKET_STATUS.PAID, TICKET_STATUS.REVOKED],
  [TICKET_STATUS.ISSUED]: [TICKET_STATUS.PAID, TICKET_STATUS.REVOKED],
  [TICKET_STATUS.PAID]: [TICKET_STATUS.USED, TICKET_STATUS.REVOKED, TICKET_STATUS.REFUNDED],
  [TICKET_STATUS.USED]: [TICKET_STATUS.REVOKED],
  [TICKET_STATUS.REVOKED]: [], // Terminal state
  [TICKET_STATUS.REFUNDED]: [], // Terminal state
}

/**
 * Terminal states that cannot transition to any other state
 */
const TERMINAL_STATES = [TICKET_STATUS.REVOKED, TICKET_STATUS.REFUNDED]

/**
 * Check if a state transition is valid
 */
export function canTransition(from: string, to: string): boolean {
  // Same state is always valid (idempotent)
  if (from === to) {
    return true
  }

  // Terminal states cannot transition
  if (TERMINAL_STATES.includes(from as any)) {
    return false
  }

  const allowedTransitions = VALID_TRANSITIONS[from] || []
  return allowedTransitions.includes(to)
}

/**
 * Get all valid transitions from a given state
 */
export function getValidTransitions(from: string): string[] {
  return VALID_TRANSITIONS[from] || []
}

/**
 * Check if a state is terminal
 */
export function isTerminalState(state: string): boolean {
  return TERMINAL_STATES.includes(state as any)
}

/**
 * Transition a ticket to a new state
 * Validates the transition and updates the ticket
 */
export async function transitionTicket(
  ticketId: string,
  newStatus: string,
  reason?: string,
  userId?: string,
  request?: NextRequest
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get current ticket state
  const { data: ticketData, error: fetchError } = await (supabase
    .from('tickets')
    .select('status, ticket_number, event_id')
    .eq('id', ticketId)
    .single() as any)

  if (fetchError || !ticketData) {
    throw new Error(`Ticket not found: ${ticketId}`)
  }

  const ticket = ticketData as any
  const currentStatus = ticket.status

  // Validate transition
  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid state transition: ${currentStatus} → ${newStatus}. ` +
        `Valid transitions from ${currentStatus}: ${getValidTransitions(currentStatus).join(', ')}`
    )
  }

  // If same state, no update needed (idempotent)
  if (currentStatus === newStatus) {
    return
  }

  // Prepare update data (using snake_case for Supabase)
  const updateData: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  // Add revocation metadata if transitioning to revoked
  if (newStatus === TICKET_STATUS.REVOKED) {
    updateData.revoked_at = new Date().toISOString()
    if (userId) {
      updateData.revoked_by = userId
    }
  }

  // Update ticket
  const { error: updateError } = await ((supabase as any)
    .from('tickets')
    .update(updateData)
    .eq('id', ticketId))

  if (updateError) {
    throw new Error(`Failed to transition ticket: ${updateError.message}`)
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: userId || null,
      action: 'ticket_state_transition',
      resourceType: 'ticket',
      resourceId: ticketId,
      changes: {
        from: currentStatus,
        to: newStatus,
        reason: reason || null,
      },
      metadata: {
        ticketNumber: ticket.ticket_number,
        eventId: ticket.event_id,
      },
    },
    request
  )
}

/**
 * Batch transition multiple tickets (e.g., for refunds)
 */
export async function transitionTickets(
  ticketIds: string[],
  newStatus: string,
  reason?: string,
  userId?: string,
  request?: NextRequest
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get current states
  const { data: tickets, error: fetchError } = await supabase
    .from('tickets')
    .select('id, status, ticket_number, event_id')
    .in('id', ticketIds)

  if (fetchError || !tickets) {
    throw new Error(`Failed to fetch tickets: ${fetchError?.message}`)
  }

  // Validate all transitions
  for (const ticket of tickets) {
    if (!canTransition(ticket.status, newStatus)) {
      throw new Error(
        `Invalid state transition for ticket ${ticket.ticket_number}: ` +
          `${ticket.status} → ${newStatus}`
      )
    }
  }

  // Prepare update data (using snake_case for Supabase)
  const updateData: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === TICKET_STATUS.REVOKED) {
    updateData.revoked_at = new Date().toISOString()
    if (userId) {
      updateData.revoked_by = userId
    }
  }

  // Update all tickets
  const { error: updateError } = await supabase
    .from('tickets')
    .update(updateData)
    .in('id', ticketIds)

  if (updateError) {
    throw new Error(`Failed to transition tickets: ${updateError.message}`)
  }

  // Log audit events for each ticket
  for (const ticket of tickets) {
    await logAuditEvent(
      {
        userId: userId || null,
        action: 'ticket_state_transition',
        resourceType: 'ticket',
        resourceId: ticket.id,
        changes: {
          from: ticket.status,
          to: newStatus,
          reason: reason || null,
        },
        metadata: {
          ticketNumber: ticket.ticket_number,
          eventId: ticket.event_id,
          batchTransition: true,
        },
      },
      request
    )
  }
}

