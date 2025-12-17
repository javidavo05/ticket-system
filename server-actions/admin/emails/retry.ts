'use server'

import { requireRole } from '@/lib/auth/permissions'
import { retryEmailDelivery } from '@/lib/services/email/delivery'
import { sendTicketDeliveryEmail } from '@/lib/services/email/templates/ticket'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError } from '@/lib/utils/errors'
import { headers } from 'next/headers'

/**
 * Retry a failed email delivery (admin action)
 */
export async function retryEmailDeliveryAction(deliveryId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SUPER_ADMIN])

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  const result = await retryEmailDelivery(deliveryId, request)

  if (!result.success) {
    throw new ValidationError(result.error || 'Failed to retry email delivery')
  }

  return {
    success: true,
    message: 'Email delivery retried successfully',
    deliveryId: result.deliveryId,
    messageId: result.messageId,
  }
}

/**
 * Resend ticket email (admin action)
 */
export async function resendTicketEmailAction(ticketId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SUPER_ADMIN])

  const result = await sendTicketDeliveryEmail(ticketId)

  if (!result.success) {
    throw new ValidationError(result.error || 'Failed to send ticket email')
  }

  return {
    success: true,
    message: 'Ticket email sent successfully',
    deliveryId: result.deliveryId,
    messageId: result.messageId,
  }
}

