'use server'

import { requireRole, canViewEventAnalytics } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'
import { searchTickets, getTicketById, type TicketSearchCriteria } from '@/lib/services/tickets/search'

/**
 * Search tickets by multiple criteria
 */
export async function searchTicketsAction(criteria: TicketSearchCriteria) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SCANNER, ROLES.ACCOUNTING])

  // If eventId is provided, verify user has access to that event
  if (criteria.eventId) {
    const hasAccess = await canViewEventAnalytics(user.id, criteria.eventId)
    if (!hasAccess) {
      throw new Error('No tienes permisos para ver tickets de este evento')
    }
  }

  return await searchTickets(criteria)
}

/**
 * Get ticket by ID with full details
 */
export async function getTicketByIdAction(ticketId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SCANNER, ROLES.ACCOUNTING])

  const ticket = await getTicketById(ticketId)

  if (!ticket) {
    throw new Error('Ticket no encontrado')
  }

  // Verify user has access to the event
  const hasAccess = await canViewEventAnalytics(user.id, ticket.eventId)
  if (!hasAccess) {
    throw new Error('No tienes permisos para ver este ticket')
  }

  return ticket
}

