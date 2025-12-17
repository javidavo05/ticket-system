import { createServiceRoleClient } from '@/lib/supabase/server'
import { canManageEvent } from '@/lib/auth/permissions'
import { hasRole, isSuperAdmin } from '@/lib/supabase/rls'
import { ROLES, EVENT_STATUS } from '@/lib/utils/constants'
import { AuthorizationError, ValidationError } from '@/lib/utils/errors'

/**
 * Validate that user owns or can manage an event
 */
export async function validateEventOwnership(userId: string, eventId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient()

  // Get event
  const { data: event, error } = await (supabase
    .from('events')
    .select('created_by, organization_id')
    .eq('id', eventId)
    .single() as any)

  if (error || !event) {
    return false
  }

  // Check if user is creator
  if ((event as any).created_by === userId) {
    return true
  }

  // Check if user is super admin
  if (await isSuperAdmin(userId)) {
    return true
  }

  // Check if user is event admin for this event
  return await canManageEvent(userId, eventId)
}

/**
 * Check if user can modify an event
 */
export async function canModifyEvent(userId: string, eventId: string): Promise<boolean> {
  return await validateEventOwnership(userId, eventId)
}

/**
 * Validate event state transition
 */
export function validateEventStateTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    [EVENT_STATUS.DRAFT]: [EVENT_STATUS.PUBLISHED, EVENT_STATUS.ARCHIVED],
    [EVENT_STATUS.PUBLISHED]: [EVENT_STATUS.LIVE, EVENT_STATUS.DRAFT, EVENT_STATUS.ARCHIVED],
    [EVENT_STATUS.LIVE]: [EVENT_STATUS.ENDED, EVENT_STATUS.ARCHIVED],
    [EVENT_STATUS.ENDED]: [EVENT_STATUS.ARCHIVED],
    [EVENT_STATUS.ARCHIVED]: [], // Terminal state
  }

  const allowed = validTransitions[currentStatus] || []

  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid state transition from ${currentStatus} to ${newStatus}`,
    }
  }

  return { valid: true }
}

/**
 * Check event dependencies before deletion
 */
export async function checkEventDependencies(eventId: string): Promise<{
  canDelete: boolean
  reasons: string[]
}> {
  const supabase = await createServiceRoleClient()
  const reasons: string[] = []

  // Check for active tickets (paid or used)
  const { data: activeTickets } = await supabase
    .from('tickets')
    .select('id')
    .eq('event_id', eventId)
    .in('status', ['paid', 'used'])
    .limit(1)

  if (activeTickets && activeTickets.length > 0) {
    reasons.push('Event has active tickets (paid or used)')
  }

  // Check for pending payments
  const { data: pendingPayments } = await supabase
    .from('payments')
    .select('id')
    .eq('event_id', eventId)
    .in('status', ['pending', 'processing'])
    .limit(1)

  if (pendingPayments && pendingPayments.length > 0) {
    reasons.push('Event has pending payments')
  }

  return {
    canDelete: reasons.length === 0,
    reasons,
  }
}

/**
 * Validate event can be published
 */
export async function validateEventCanBePublished(eventId: string): Promise<{
  canPublish: boolean
  reasons: string[]
}> {
  const supabase = await createServiceRoleClient()
  const reasons: string[] = []

  // Get event
  const { data: event, error } = await (supabase
    .from('events')
    .select('id, start_date, end_date, status')
    .eq('id', eventId)
    .single() as any)

  if (error || !event) {
    reasons.push('Event not found')
    return { canPublish: false, reasons }
  }

  // Check if event has at least one ticket type
  const { data: ticketTypes } = await (supabase
    .from('ticket_types')
    .select('id')
    .eq('event_id', eventId)
    .limit(1) as any)

  if (!ticketTypes || ticketTypes.length === 0) {
    reasons.push('Event must have at least one ticket type')
  }

  // Validate dates
  const now = new Date()
  const startDate = new Date((event as any).start_date)
  const endDate = new Date((event as any).end_date)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    reasons.push('Invalid event dates')
  } else if (startDate >= endDate) {
    reasons.push('Start date must be before end date')
  }

  // Check current status
  if ((event as any).status === EVENT_STATUS.LIVE) {
    reasons.push('Event is already live')
  }

  return {
    canPublish: reasons.length === 0,
    reasons,
  }
}

