'use server'

import { requireRole } from '@/lib/auth/permissions'
import { revokeTicket, revokeTicketsByPayment, revokeTicketsByEvent } from '@/lib/services/tickets/revocation'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError } from '@/lib/utils/errors'
import { headers } from 'next/headers'
import { getTicketById } from '@/lib/services/tickets/search'
import { canManageEvent } from '@/lib/auth/permissions'

/**
 * Manually revoke a single ticket (admin action)
 */
export async function manualRevokeTicketAction(ticketId: string, reason: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING])

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('La razón es requerida para revocar un ticket')
  }

  // Get ticket to verify event access
  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    throw new Error('Ticket no encontrado')
  }

  // Verify user can manage this event
  const canManage = await canManageEvent(user.id, ticket.eventId)
  if (!canManage) {
    throw new Error('No tienes permisos para revocar tickets de este evento')
  }

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  await revokeTicket(ticketId, reason, user.id, request as any)

  return { success: true, message: 'Ticket revocado exitosamente' }
}

/**
 * Revoke a single ticket (admin action) - Legacy, kept for backward compatibility
 */
export async function revokeTicketAction(ticketId: string, reason: string) {
  return await manualRevokeTicketAction(ticketId, reason)
}

/**
 * Revoke tickets by payment ID (for refunds)
 */
export async function revokeTicketsByPaymentAction(paymentId: string, reason: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING, ROLES.SUPER_ADMIN])

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Reason is required for ticket revocation')
  }

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  await revokeTicketsByPayment(paymentId, reason, user.id, request as any)

  return { success: true, message: 'Tickets revoked successfully' }
}

/**
 * Revoke all tickets for an event (admin action)
 */
export async function revokeTicketsByEventAction(eventId: string, reason: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SUPER_ADMIN])

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Reason is required for ticket revocation')
  }

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  const count = await revokeTicketsByEvent(eventId, reason, user.id, request as any)

  return {
    success: true,
    message: `${count} ticket(s) revoked successfully`,
    count,
  }
}

