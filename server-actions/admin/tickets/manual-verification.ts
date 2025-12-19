'use server'

import { requireRole } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'
import { manualValidateTicket, getTicketScanHistory } from '@/lib/services/tickets/manual-verification'
import { canScanTickets } from '@/lib/auth/permissions'
import { getTicketById } from '@/lib/services/tickets/search'
import { headers } from 'next/headers'

/**
 * Manually validate a ticket
 */
export async function manualValidateTicketAction(
  ticketId: string,
  notes?: string,
  location?: { lat: number; lng: number }
) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SCANNER])

  // Get ticket to verify event access
  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    throw new Error('Ticket no encontrado')
  }

  // Verify user can scan tickets for this event
  const canScan = await canScanTickets(user.id, ticket.eventId)
  if (!canScan) {
    throw new Error('No tienes permisos para validar tickets de este evento')
  }

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  return await manualValidateTicket(ticketId, user.id, notes, location, request as any)
}

/**
 * Get complete scan history for a ticket
 */
export async function getTicketScanHistoryAction(ticketId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SCANNER, ROLES.ACCOUNTING])

  // Get ticket to verify event access
  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    throw new Error('Ticket no encontrado')
  }

  // Verify user has access to the event
  const { canViewEventAnalytics } = await import('@/lib/auth/permissions')
  const hasAccess = await canViewEventAnalytics(user.id, ticket.eventId)
  if (!hasAccess) {
    throw new Error('No tienes permisos para ver el historial de este ticket')
  }

  return await getTicketScanHistory(ticketId)
}

