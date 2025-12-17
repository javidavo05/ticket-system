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

  const { data: group, error } = await (supabase
    .from('ticket_groups')
    .select('promoter_id, organization_id, event_id')
    .eq('id', groupId)
    .single() as any)

  if (error || !group) {
    return {
      isValid: false,
      reason: 'Group not found',
    }
  }

  const groupData = group as any

  if (groupData.promoter_id !== promoterId) {
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

  const { data: group, error } = await (supabase
    .from('ticket_groups')
    .select('status, tickets_assigned, total_tickets')
    .eq('id', groupId)
    .single() as any)

  if (error || !group) {
    return {
      isValid: false,
      reason: 'Group not found',
    }
  }

  const groupData = group as any

  if (groupData.status === 'cancelled') {
    return {
      isValid: false,
      reason: 'Cannot assign tickets to a cancelled group',
    }
  }

  if (groupData.status === 'completed') {
    return {
      isValid: false,
      reason: 'Cannot assign tickets to a completed group',
    }
  }

  if ((groupData.tickets_assigned || 0) >= (groupData.total_tickets || 0)) {
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

  const { data: group, error } = await (supabase
    .from('ticket_groups')
    .select(
      'status, tickets_assigned, total_tickets, amount_paid, total_amount, allows_partial'
    )
    .eq('id', groupId)
    .single() as any)

  if (error || !group) {
    return {
      isValid: false,
      reason: 'Group not found',
    }
  }

  const groupData = group as any

  if (groupData.status === 'cancelled') {
    return {
      isValid: false,
      reason: 'Cannot complete a cancelled group',
    }
  }

  if (groupData.status === 'completed') {
    return {
      isValid: false,
      reason: 'Group is already completed',
    }
  }

  // Check that all tickets are assigned
  const ticketsAssigned = groupData.tickets_assigned || 0
  const totalTickets = groupData.total_tickets || 0
  if (ticketsAssigned < totalTickets) {
    return {
      isValid: false,
      reason: `Not all tickets are assigned. ${totalTickets - ticketsAssigned} tickets remaining.`,
    }
  }

  // Check payment status
  const amountPaid = parseFloat((groupData.amount_paid || '0') as string)
  const totalAmount = parseFloat((groupData.total_amount || '0') as string)

  if (!groupData.allows_partial && amountPaid < totalAmount) {
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
  const { data: ticketType, error } = await (supabase
    .from('ticket_types')
    .select('event_id')
    .eq('id', ticketTypeId)
    .single() as any)

  if (error || !ticketType) {
    return {
      isValid: false,
      reason: 'Ticket type not found',
    }
  }

  const ticketTypeData = ticketType as any

  if (ticketTypeData.event_id !== eventId) {
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
  const { data: event, error: eventError } = await (supabase
    .from('events')
    .select('organization_id')
    .eq('id', eventId)
    .single() as any)

  if (eventError || !event) {
    return {
      isValid: false,
      reason: 'Event not found',
    }
  }

  const eventData = event as any

  if (!eventData.organization_id) {
    // Event has no organization, allow
    return { isValid: true }
  }

  // Get promoter organization
  const { data: promoter, error: promoterError } = await (supabase
    .from('users')
    .select('organization_id')
    .eq('id', promoterId)
    .single() as any)

  if (promoterError || !promoter) {
    return {
      isValid: false,
      reason: 'Promoter not found',
    }
  }

  const promoterData = promoter as any

  if (promoterData.organization_id !== eventData.organization_id) {
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

