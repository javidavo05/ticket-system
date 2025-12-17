/**
 * Promoter Groups Assignment Service
 * Handles bulk and individual ticket assignments
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { validatePromoterAccess, validateGroupCanBeAssigned, validateEmail } from './validation'
import { generateTicket } from '@/lib/services/tickets/generation'

export interface TicketAssignment {
  email: string
  name: string
  phone?: string
}

export interface BulkAssignmentResult {
  success: boolean
  assignedCount: number
  failedCount: number
  errors: Array<{ index: number; error: string }>
}

/**
 * Bulk assign tickets to a group
 */
export async function bulkAssignTickets(
  groupId: string,
  promoterId: string,
  assignments: TicketAssignment[]
): Promise<BulkAssignmentResult> {
  // Validate promoter access
  const accessValidation = await validatePromoterAccess(promoterId, groupId)
  if (!accessValidation.isValid) {
    throw new ValidationError(accessValidation.reason || 'Access denied')
  }

  // Validate group can be assigned
  const groupValidation = await validateGroupCanBeAssigned(groupId)
  if (!groupValidation.isValid) {
    throw new ValidationError(groupValidation.reason || 'Group cannot be assigned')
  }

  const supabase = await createServiceRoleClient()

  // Get group info
  const { data: group, error: groupError } = await (supabase
    .from('ticket_groups')
    .select('total_tickets, tickets_assigned, event_id, ticket_type_id, organization_id')
    .eq('id', groupId)
    .single() as any)

  if (groupError || !group) {
    throw new NotFoundError('Ticket group')
  }

  const groupData = (group || {}) as any

  // Validate we have enough unassigned tickets
  const availableTickets = (groupData.total_tickets || 0) - (groupData.tickets_assigned || 0)
  if (assignments.length > availableTickets) {
    throw new ValidationError(
      `Only ${availableTickets} tickets available for assignment. Requested ${assignments.length}.`
    )
  }

  // Get unassigned tickets for this group
  const { data: unassignedTickets, error: ticketsError } = await (supabase
    .from('tickets')
    .select('id')
    .eq('ticket_group_id', groupId)
    .is('assigned_to_email', null)
    .limit(assignments.length) as any)

  if (ticketsError) {
    throw new Error(`Failed to fetch tickets: ${ticketsError.message}`)
  }

  const unassignedTicketsData = (unassignedTickets || []) as any[]
  if (unassignedTicketsData.length < assignments.length) {
    // Need to create more tickets
    const ticketsToCreate = assignments.length - unassignedTicketsData.length
    await createTicketsForGroup(
      groupId,
      groupData.event_id,
      groupData.ticket_type_id,
      groupData.organization_id || undefined,
      promoterId,
      ticketsToCreate
    )

    // Fetch again
    const { data: newTickets, error: newTicketsError } = await (supabase
      .from('tickets')
      .select('id')
      .eq('ticket_group_id', groupId)
      .is('assigned_to_email', null)
      .limit(assignments.length) as any)

    if (newTicketsError || !newTickets) {
      throw new Error('Failed to create tickets for group')
    }

    const newTicketsData = (newTickets || []) as any[]
    unassignedTicketsData.push(...newTicketsData)
  }

  const result: BulkAssignmentResult = {
    success: true,
    assignedCount: 0,
    failedCount: 0,
    errors: [],
  }

  // Assign each ticket
  for (let i = 0; i < assignments.length && i < unassignedTicketsData.length; i++) {
    const assignment = assignments[i]
    const ticketId = unassignedTicketsData[i].id

    // Validate email
    const emailValidation = validateEmail(assignment.email)
    if (!emailValidation.isValid) {
      result.failedCount++
      result.errors.push({
        index: i,
        error: emailValidation.reason || 'Invalid email',
      })
      continue
    }

    try {
      await assignTicket(ticketId, promoterId, assignment)
      result.assignedCount++
    } catch (error) {
      result.failedCount++
      result.errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Update group counters
  const { error: updateError } = await ((supabase
    .from('ticket_groups') as any)
    .update({
      tickets_assigned: groupData.tickets_assigned + result.assignedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId))

  if (updateError) {
    throw new Error(`Failed to update group: ${updateError.message}`)
  }

  result.success = result.failedCount === 0
  return result
}

/**
 * Assign a single ticket
 */
export async function assignTicket(
  ticketId: string,
  promoterId: string,
  assignment: TicketAssignment
): Promise<void> {
  // Validate email
  const emailValidation = validateEmail(assignment.email)
  if (!emailValidation.isValid) {
    throw new ValidationError(emailValidation.reason || 'Invalid email')
  }

  const supabase = await createServiceRoleClient()

  // Get ticket and verify it belongs to promoter
  const { data: ticket, error: ticketError } = await (supabase
    .from('tickets')
    .select('id, ticket_group_id, promoter_id, assigned_to_email')
    .eq('id', ticketId)
    .single() as any)

  if (ticketError || !ticket) {
    throw new NotFoundError('Ticket')
  }

  const ticketData = ticket as any

  // Verify ticket belongs to promoter
  if (ticketData.promoter_id !== promoterId) {
    throw new ValidationError('Ticket does not belong to this promoter')
  }

  // Check if already assigned
  if (ticketData.assigned_to_email) {
    throw new ValidationError('Ticket is already assigned')
  }

  // Update ticket
  const { error: updateError } = await ((supabase
    .from('tickets') as any)
    .update({
      assigned_to_email: assignment.email,
      assigned_to_name: assignment.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId))

  if (updateError) {
    throw new Error(`Failed to assign ticket: ${updateError.message}`)
  }

  // Create assignment record
  if (ticketData.ticket_group_id) {
    const { error: assignmentError } = await ((supabase.from('ticket_assignments') as any).insert({
      ticket_id: ticketId,
      ticket_group_id: ticketData.ticket_group_id,
      promoter_id: promoterId,
      assigned_to_email: assignment.email,
      assigned_to_name: assignment.name,
      assigned_to_phone: assignment.phone,
      assigned_by: promoterId,
      status: 'assigned',
    }))

    if (assignmentError) {
      // Log error but don't fail - assignment is already done
      console.error('Failed to create assignment record:', assignmentError)
    }
  }
}

/**
 * Unassign a ticket
 */
export async function unassignTicket(ticketId: string, promoterId: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get ticket and verify it belongs to promoter
  const { data: ticket, error: ticketError } = await (supabase
    .from('tickets')
    .select('id, ticket_group_id, promoter_id, assigned_to_email')
    .eq('id', ticketId)
    .single() as any)

  if (ticketError || !ticket) {
    throw new NotFoundError('Ticket')
  }

  const ticketData = ticket as any

  if (ticketData.promoter_id !== promoterId) {
    throw new ValidationError('Ticket does not belong to this promoter')
  }

  if (!ticketData.assigned_to_email) {
    throw new ValidationError('Ticket is not assigned')
  }

  // Update ticket
  const { error: updateError } = await ((supabase
    .from('tickets') as any)
    .update({
      assigned_to_email: null,
      assigned_to_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId))

  if (updateError) {
    throw new Error(`Failed to unassign ticket: ${updateError.message}`)
  }

  // Update assignment record status
  if (ticketData.ticket_group_id) {
    await ((supabase
      .from('ticket_assignments') as any)
      .update({ status: 'cancelled' })
      .eq('ticket_id', ticketId)
      .eq('status', 'assigned'))
  }

  // Update group counter
  if (ticketData.ticket_group_id) {
    await (supabase.rpc as any)('decrement_tickets_assigned', {
      group_id: ticketData.ticket_group_id,
    })
  }
}

/**
 * Get all assignments for a group
 */
export async function getGroupAssignments(groupId: string) {
  const supabase = await createServiceRoleClient()

  const { data: assignments, error } = await (supabase
    .from('ticket_assignments')
    .select('*, tickets(*)')
    .eq('ticket_group_id', groupId)
    .order('assigned_at', { ascending: false }) as any)

  if (error) {
    throw new Error(`Failed to fetch assignments: ${error.message}`)
  }

  return assignments || []
}

/**
 * Create tickets for a group
 */
async function createTicketsForGroup(
  groupId: string,
  eventId: string,
  ticketTypeId: string,
  organizationId: string | undefined,
  promoterId: string,
  quantity: number
): Promise<string[]> {
  const supabase = await createServiceRoleClient()

  // Get ticket type for pricing
  const { data: ticketType, error: ticketTypeError } = await (supabase
    .from('ticket_types')
    .select('price')
    .eq('id', ticketTypeId)
    .single() as any)

  if (ticketTypeError || !ticketType) {
    throw new NotFoundError('Ticket type')
  }

  const ticketTypeData = ticketType as any

  // Get promoter info
  const { data: promoter, error: promoterError } = await (supabase
    .from('users')
    .select('email, full_name')
    .eq('id', promoterId)
    .single() as any)

  if (promoterError || !promoter) {
    throw new NotFoundError('Promoter')
  }

  const promoterData = promoter as any

  // Generate tickets
  const ticketIds: string[] = []
  for (let i = 0; i < quantity; i++) {
    const ticketId = await generateTicket({
      ticketTypeId,
      eventId,
      purchaserId: promoterId,
      purchaserEmail: promoterData.email || '',
      purchaserName: promoterData.full_name || 'Promoter',
    })
    ticketIds.push(ticketId)
  }

  // Update tickets with group_id and promoter_id
  const { error: updateError } = await ((supabase
    .from('tickets') as any)
    .update({
      ticket_group_id: groupId,
      promoter_id: promoterId,
    })
    .in('id', ticketIds))

  if (updateError) {
    throw new Error(`Failed to link tickets to group: ${updateError.message}`)
  }

  return ticketIds
}

