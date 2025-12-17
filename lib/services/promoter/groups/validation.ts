/**
 * Promoter Groups Validation Service
 * Validates access, availability, and state transitions for ticket groups
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError, AuthorizationError } from '@/lib/utils/errors'
import { checkTicketTypeAvailability } from '@/lib/services/events/availability'

export interface GroupValidationResult {
  isValid: boolean
  reason?: string
}

/**
 * Validate that a promoter has access to a ticket group
 */
export async function validatePromoterAccess(
  promoterId: string,
  groupId: string
): Promise<GroupValidationResult> {
  const supabase = await createServiceRoleClient()

  const { data: group, error } = await supabase
    .from('ticket_groups')
    .select('promoter_id, organization_id, event_id')
    .eq('id', groupId)
    .single()

  if (error || !group) {
    return {
      isValid: false,
      reason: 'Group not found',
    }
  }

  if (group.promoter_id !== promoterId) {
    return {
      isValid: false,
      reason: 'Promoter does not have access to this group',
    }
  }

  return { isValid: true }
}

/**
 * Validate that a group can receive ticket assignments
 */
export async function validateGroupCanBeAssigned(
  groupId: string
): Promise<GroupValidationResult> {
  const supabase = await createServiceRoleClient()

  const { data: group, error } = await supabase
    .from('ticket_groups')
    .select('status, tickets_assigned, total_tickets')
    .eq('id', groupId)
    .single()

  if (error || !group) {
    return {
      isValid: false,
      reason: 'Group not found',
    }
  }

  if (group.status === 'cancelled') {
    return {
      isValid: false,
      reason: 'Cannot assign tickets to a cancelled group',
    }
  }

  if (group.status === 'completed') {
    return {
      isValid: false,
      reason: 'Cannot assign tickets to a completed group',
    }
  }

  if (group.tickets_assigned >= group.total_tickets) {
    return {
      isValid: false,
      reason: 'All tickets in this group have already been assigned',
    }
  }

  return { isValid: true }
}

/**
 * Validate that a group can be completed
 */
export async function validateGroupCanBeCompleted(
  groupId: string
): Promise<GroupValidationResult> {
  const supabase = await createServiceRoleClient()

  const { data: group, error } = await supabase
    .from('ticket_groups')
    .select(
      'status, tickets_assigned, total_tickets, amount_paid, total_amount, allows_partial'
    )
    .eq('id', groupId)
    .single()

  if (error || !group) {
    return {
      isValid: false,
      reason: 'Group not found',
    }
  }

  if (group.status === 'cancelled') {
    return {
      isValid: false,
      reason: 'Cannot complete a cancelled group',
    }
  }

  if (group.status === 'completed') {
    return {
      isValid: false,
      reason: 'Group is already completed',
    }
  }

  // Check that all tickets are assigned
  if (group.tickets_assigned < group.total_tickets) {
    return {
      isValid: false,
      reason: `Not all tickets are assigned. ${group.total_tickets - group.tickets_assigned} tickets remaining.`,
    }
  }

  // Check payment status
  const amountPaid = parseFloat(group.amount_paid as string)
  const totalAmount = parseFloat(group.total_amount as string)

  if (!group.allows_partial && amountPaid < totalAmount) {
    return {
      isValid: false,
      reason: `Payment is not complete. ${totalAmount - amountPaid} remaining.`,
    }
  }

  return { isValid: true }
}

/**
 * Validate ticket availability for a group
 */
export async function validateTicketAvailability(
  eventId: string,
  ticketTypeId: string,
  quantity: number
): Promise<GroupValidationResult> {
  if (quantity <= 0) {
    return {
      isValid: false,
      reason: 'Quantity must be greater than 0',
    }
  }

  const availability = await checkTicketTypeAvailability(ticketTypeId, quantity)

  if (!availability.canPurchase) {
    return {
      isValid: false,
      reason: availability.reason || 'Tickets not available',
    }
  }

  // Verify ticket type belongs to event
  const supabase = await createServiceRoleClient()
  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .select('event_id')
    .eq('id', ticketTypeId)
    .single()

  if (error || !ticketType) {
    return {
      isValid: false,
      reason: 'Ticket type not found',
    }
  }

  if (ticketType.event_id !== eventId) {
    return {
      isValid: false,
      reason: 'Ticket type does not belong to the specified event',
    }
  }

  return { isValid: true }
}

/**
 * Validate that a promoter belongs to the organization of an event
 */
export async function validatePromoterOrganization(
  promoterId: string,
  eventId: string
): Promise<GroupValidationResult> {
  const supabase = await createServiceRoleClient()

  // Get event organization
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return {
      isValid: false,
      reason: 'Event not found',
    }
  }

  if (!event.organization_id) {
    // Event has no organization, allow
    return { isValid: true }
  }

  // Get promoter organization
  const { data: promoter, error: promoterError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', promoterId)
    .single()

  if (promoterError || !promoter) {
    return {
      isValid: false,
      reason: 'Promoter not found',
    }
  }

  if (promoter.organization_id !== event.organization_id) {
    return {
      isValid: false,
      reason: 'Promoter does not belong to the event organization',
    }
  }

  return { isValid: true }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): GroupValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      reason: 'Invalid email format',
    }
  }
  return { isValid: true }
}

/**
 * Validate group status transition
 */
export function validateGroupStatusTransition(
  currentStatus: string,
  newStatus: string
): GroupValidationResult {
  const validTransitions: Record<string, string[]> = {
    pending: ['active', 'cancelled'],
    active: ['completed', 'cancelled'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
  }

  const allowedStatuses = validTransitions[currentStatus] || []

  if (!allowedStatuses.includes(newStatus)) {
    return {
      isValid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}`,
    }
  }

  return { isValid: true }
}

