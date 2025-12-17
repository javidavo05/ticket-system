/**
 * Promoter Groups Completion Service
 * Handles group completion and cancellation
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { validatePromoterAccess, validateGroupCanBeCompleted, validateGroupStatusTransition } from './validation'
import { isGroupPaymentComplete } from './payments'
import { transitionTicket } from '@/lib/services/tickets/state-machine'
import { TICKET_STATUS } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'

export interface GroupStatistics {
  totalTickets: number
  ticketsAssigned: number
  ticketsSold: number
  totalAmount: number
  amountPaid: number
  remainingAmount: number
  paymentComplete: boolean
  status: string
}

/**
 * Complete a ticket group
 */
export async function completeGroup(
  groupId: string,
  completedBy: string
): Promise<void> {
  // Validate promoter access
  const accessValidation = await validatePromoterAccess(completedBy, groupId)
  if (!accessValidation.isValid) {
    throw new ValidationError(accessValidation.reason || 'Access denied')
  }

  // Validate group can be completed
  const completionValidation = await validateGroupCanBeCompleted(groupId)
  if (!completionValidation.isValid) {
    throw new ValidationError(completionValidation.reason || 'Group cannot be completed')
  }

  const supabase = await createServiceRoleClient()

  // Get group info
  const { data: group, error: groupError } = await (supabase
    .from('ticket_groups')
    .select('status, event_id, ticket_type_id, organization_id')
    .eq('id', groupId)
    .single() as any)

  if (groupError || !group) {
    throw new NotFoundError('Ticket group')
  }

  const groupData = group as any

  // Validate status transition
  const transitionValidation = validateGroupStatusTransition(groupData.status, 'completed')
  if (!transitionValidation.isValid) {
    throw new ValidationError(transitionValidation.reason || 'Invalid status transition')
  }

  // Update group status
  const { error: updateError } = await ((supabase
    .from('ticket_groups') as any)
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId))

  if (updateError) {
    throw new Error(`Failed to complete group: ${updateError.message}`)
  }

  // Transition all assigned tickets to PAID status
  const { data: tickets, error: ticketsError } = await (supabase
    .from('tickets')
    .select('id, status')
    .eq('ticket_group_id', groupId)
    .not('assigned_to_email', 'is', null) as any)

  if (ticketsError) {
    throw new Error(`Failed to fetch tickets: ${ticketsError.message}`)
  }

  const ticketsData = (tickets || []) as any[]
  // Transition tickets to paid status
  for (const ticket of ticketsData) {
    try {
      await transitionTicket(ticket.id, TICKET_STATUS.PAID, 'Group completed', completedBy)
    } catch (error) {
      // Log but don't fail - ticket might already be in correct state
      console.error(`Failed to transition ticket ${ticket.id}:`, error)
    }
  }

  // Log audit event
  await logAuditEvent({
    userId: completedBy,
    action: 'group_completed',
    resourceType: 'ticket_group',
    resourceId: groupId,
    metadata: {
      eventId: groupData.event_id,
      ticketTypeId: groupData.ticket_type_id,
      organizationId: groupData.organization_id,
    },
  })
}

/**
 * Cancel a ticket group
 */
export async function cancelGroup(
  groupId: string,
  reason: string,
  cancelledBy: string
): Promise<void> {
  // Validate promoter access
  const accessValidation = await validatePromoterAccess(cancelledBy, groupId)
  if (!accessValidation.isValid) {
    throw new ValidationError(accessValidation.reason || 'Access denied')
  }

  const supabase = await createServiceRoleClient()

  // Get group info
  const { data: group, error: groupError } = await (supabase
    .from('ticket_groups')
    .select('status, event_id, ticket_type_id, organization_id')
    .eq('id', groupId)
    .single() as any)

  if (groupError || !group) {
    throw new NotFoundError('Ticket group')
  }

  const groupData = group as any

  // Validate status transition
  const transitionValidation = validateGroupStatusTransition(groupData.status, 'cancelled')
  if (!transitionValidation.isValid) {
    throw new ValidationError(transitionValidation.reason || 'Invalid status transition')
  }

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Cancellation reason is required')
  }

  // Update group status
  const { error: updateError } = await ((supabase
    .from('ticket_groups') as any)
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId))

  if (updateError) {
    throw new Error(`Failed to cancel group: ${updateError.message}`)
  }

  // Revoke all tickets in the group
  const { data: tickets, error: ticketsError } = await (supabase
    .from('tickets')
    .select('id')
    .eq('ticket_group_id', groupId) as any)

  if (ticketsError) {
    throw new Error(`Failed to fetch tickets: ${ticketsError.message}`)
  }

  const ticketsData = (tickets || []) as any[]
  // Revoke tickets
  for (const ticket of ticketsData) {
    try {
      await transitionTicket(ticket.id, TICKET_STATUS.REVOKED, 'Group cancelled', cancelledBy)
    } catch (error) {
      // Log but don't fail
      console.error(`Failed to revoke ticket ${ticket.id}:`, error)
    }
  }

  // Get payment_id from group
  const { data: groupWithPayment, error: paymentGroupError } = await (supabase
    .from('ticket_groups')
    .select('payment_id')
    .eq('id', groupId)
    .single() as any)

  // Cancel payment if exists
  if (!paymentGroupError && groupWithPayment) {
    const groupWithPaymentData = groupWithPayment as any
    if (groupWithPaymentData.payment_id) {
      const { error: paymentError } = await ((supabase
        .from('payments') as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancellation_reason: `Group cancelled: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupWithPaymentData.payment_id))

      if (paymentError) {
        console.error(`Failed to cancel payment: ${paymentError.message}`)
      }
    }
  }

  // Log audit event
  await logAuditEvent({
    userId: cancelledBy,
    action: 'group_cancelled',
    resourceType: 'ticket_group',
    resourceId: groupId,
    metadata: {
      eventId: groupData.event_id,
      ticketTypeId: groupData.ticket_type_id,
      organizationId: groupData.organization_id,
      reason,
    },
  })
}

/**
 * Get statistics for a ticket group
 */
export async function getGroupStatistics(groupId: string): Promise<GroupStatistics> {
  const supabase = await createServiceRoleClient()

  // Get group info
  const { data: group, error: groupError } = await (supabase
    .from('ticket_groups')
    .select(
      'total_tickets, tickets_assigned, tickets_sold, total_amount, amount_paid, status'
    )
    .eq('id', groupId)
    .single() as any)

  if (groupError || !group) {
    throw new NotFoundError('Ticket group')
  }

  const groupData = group as any

  const totalAmount = parseFloat(groupData.total_amount as string)
  const amountPaid = parseFloat(groupData.amount_paid as string)
  const remainingAmount = totalAmount - amountPaid
  const paymentComplete = await isGroupPaymentComplete(groupId)

  return {
    totalTickets: groupData.total_tickets || 0,
    ticketsAssigned: groupData.tickets_assigned || 0,
    ticketsSold: groupData.tickets_sold || 0,
    totalAmount,
    amountPaid,
    remainingAmount,
    paymentComplete,
    status: groupData.status || '',
  }
}

