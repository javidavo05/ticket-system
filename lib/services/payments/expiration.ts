import { createServiceRoleClient } from '@/lib/supabase/server'
import { PAYMENT_STATUS } from '@/lib/utils/constants'
import { transitionPayment } from './state-machine'
import { isPaymentExpired } from './domain'
import { logAuditEvent } from '@/lib/security/audit'

/**
 * Check and handle payment expiration
 * Transitions expired payments to cancelled and reverts reservations
 */
export async function checkPaymentExpiration(paymentId: string): Promise<{
  wasExpired: boolean
  reverted: boolean
}> {
  const supabase = await createServiceRoleClient()

  // Get payment
  const { data: payment, error: paymentError } = await (supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single() as any)

  if (paymentError || !payment) {
    throw new Error(`Payment not found: ${paymentId}`)
  }

  const paymentData = payment as any

  // Check if already cancelled or completed
  if (paymentData.status === PAYMENT_STATUS.CANCELLED || paymentData.status === PAYMENT_STATUS.COMPLETED) {
    return { wasExpired: false, reverted: false }
  }

  // Check if expired
  const expired = isPaymentExpired({
    ...paymentData,
    expiresAt: paymentData.expires_at ? new Date(paymentData.expires_at) : undefined,
    createdAt: new Date(paymentData.created_at),
  } as any)

  if (!expired) {
    return { wasExpired: false, reverted: false }
  }

  // Transition to cancelled
  await transitionPayment(
    paymentId,
    PAYMENT_STATUS.CANCELLED,
    'Payment expired',
    undefined
  )

  // Revert ticket reservations
  const { data: tickets, error: ticketsError } = await (supabase
    .from('tickets')
    .select('id, ticket_type_id, status')
    .eq('payment_id', paymentId)
    .in('status', ['pending_payment', 'issued']) as any)

  if (!ticketsError && tickets && tickets.length > 0) {
    const ticketsData = (tickets || []) as any[]
    // Get ticket types to revert quantity_sold
    const ticketTypeIds = [...new Set(ticketsData.map((t: any) => t.ticket_type_id))]

    for (const ticketTypeId of ticketTypeIds) {
      const ticketsForType = ticketsData.filter((t: any) => t.ticket_type_id === ticketTypeId)
      const quantity = ticketsForType.length

      // Revert quantity_sold
      await supabase.rpc('decrement_ticket_type_sold', {
        ticket_type_id: ticketTypeId,
        quantity: quantity,
      })

      // Alternative: Direct update if RPC doesn't exist
      const { data: ticketType } = await (supabase
        .from('ticket_types')
        .select('quantity_sold')
        .eq('id', ticketTypeId)
        .single() as any)

      if (ticketType) {
        const ticketTypeData = ticketType as any
        const newQuantitySold = Math.max(0, (ticketTypeData.quantity_sold as number) - quantity)
        await ((supabase
          .from('ticket_types') as any)
          .update({ quantity_sold: newQuantitySold })
          .eq('id', ticketTypeId))
      }
    }

    // Delete or mark tickets as cancelled
    // Option 1: Delete tickets (if they were just reserved)
    // Option 2: Mark as revoked
    // For now, we'll mark them as revoked to maintain audit trail
    const { error: revokeError } = await ((supabase
      .from('tickets') as any)
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentId)
      .in('status', ['pending_payment', 'issued']))

    if (revokeError) {
      console.error(`Failed to revoke tickets for expired payment ${paymentId}:`, revokeError)
    }

    // Log audit event
    await logAuditEvent(
      {
        userId: undefined,
        action: 'payment_expired_tickets_reverted',
        resourceType: 'payment',
        resourceId: paymentId,
        organizationId: paymentData.organization_id || undefined,
        metadata: {
          ticketCount: ticketsData.length,
          ticketTypeIds: ticketTypeIds,
        },
      },
      undefined
    )

    return { wasExpired: true, reverted: true }
  }

  return { wasExpired: true, reverted: false }
}

/**
 * Extend payment expiration date
 */
export async function extendPaymentExpiration(
  paymentId: string,
  newExpirationDate: Date,
  extendedBy: string
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get payment
  const { data: payment, error: paymentError } = await (supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single() as any)

  if (paymentError || !payment) {
    throw new Error(`Payment not found: ${paymentId}`)
  }

  const paymentData = payment as any

  // Validate new expiration is in the future
  if (newExpirationDate <= new Date()) {
    throw new Error('New expiration date must be in the future')
  }

  // Validate new expiration is after current expiration (if exists)
  if (paymentData.expires_at && newExpirationDate <= new Date(paymentData.expires_at)) {
    throw new Error('New expiration date must be after current expiration date')
  }

  // Update expiration
  const { error: updateError } = await ((supabase
    .from('payments') as any)
    .update({
      expires_at: newExpirationDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId))

  if (updateError) {
    throw new Error(`Failed to extend payment expiration: ${updateError.message}`)
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: extendedBy,
      action: 'payment_expiration_extended',
      resourceType: 'payment',
      resourceId: paymentId,
      organizationId: paymentData.organization_id || undefined,
      metadata: {
        oldExpiration: paymentData.expires_at,
        newExpiration: newExpirationDate.toISOString(),
      },
    },
    undefined
  )
}

/**
 * Process expired payments in batch
 */
export async function processExpiredPayments(limit: number = 100): Promise<{
  processed: number
  expired: number
  reverted: number
}> {
  const supabase = await createServiceRoleClient()
  const now = new Date().toISOString()

  // Get expired payments
  const { data: expiredPayments, error: fetchError } = await (supabase
    .from('payments')
    .select('id')
    .eq('status', PAYMENT_STATUS.PENDING)
    .not('expires_at', 'is', null)
    .lte('expires_at', now)
    .limit(limit) as any)

  if (fetchError) {
    throw new Error(`Failed to fetch expired payments: ${fetchError.message}`)
  }

  if (!expiredPayments || expiredPayments.length === 0) {
    return { processed: 0, expired: 0, reverted: 0 }
  }

  const expiredPaymentsData = (expiredPayments || []) as any[]
  let expired = 0
  let reverted = 0

  // Process each expired payment
  for (const payment of expiredPaymentsData) {
    try {
      const result = await checkPaymentExpiration(payment.id)
      if (result.wasExpired) {
        expired++
      }
      if (result.reverted) {
        reverted++
      }
    } catch (error) {
      console.error(`Error processing expired payment ${payment.id}:`, error)
    }
  }

  return {
    processed: expiredPaymentsData.length,
    expired,
    reverted,
  }
}

