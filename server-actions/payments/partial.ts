'use server'

import { createPartialPayment } from '@/lib/services/payments/creation'
import { reconcileBankTransfer } from '@/lib/services/payments/reconciliation'
import { extendPaymentExpiration } from '@/lib/services/payments/expiration'
import { transitionPayment } from '@/lib/services/payments/state-machine'
import { canCancelPayment } from '@/lib/services/payments/domain'
import { PAYMENT_STATUS } from '@/lib/utils/constants'
import { requireAccounting, requireRole, getCurrentUser } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'
import { headers } from 'next/headers'

/**
 * Create a partial payment for an existing payment
 */
export async function createPartialPaymentAction(
  paymentId: string,
  amount: number,
  provider?: string
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Only accounting and event admins can create partial payments
  try {
    await requireAccounting()
  } catch {
    // Try event admin
    await requireRole(ROLES.EVENT_ADMIN)
  }

  return await createPartialPayment(paymentId, amount, provider)
}

/**
 * Reconcile a bank transfer payment manually
 */
export async function reconcileBankTransferAction(
  paymentId: string,
  referenceNumber: string,
  amount: number
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Only accounting can reconcile bank transfers
  await requireAccounting()

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  return await reconcileBankTransfer(paymentId, referenceNumber, amount, user.id, request as any)
}

/**
 * Extend payment expiration date
 */
export async function extendPaymentExpirationAction(
  paymentId: string,
  newExpirationDate: Date
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Only accounting and event admins can extend expiration
  try {
    await requireAccounting()
  } catch {
    await requireRole(ROLES.EVENT_ADMIN)
  }

  return await extendPaymentExpiration(paymentId, newExpirationDate, user.id)
}

/**
 * Cancel a payment
 */
export async function cancelPaymentAction(
  paymentId: string,
  reason?: string
) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Only accounting and event admins can cancel payments
  try {
    await requireAccounting()
  } catch {
    await requireRole(ROLES.EVENT_ADMIN)
  }

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  // Check if payment can be cancelled
  const { createServiceRoleClient } = await import('@/lib/supabase/server')
  const supabase = await createServiceRoleClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (!payment) {
    throw new Error('Payment not found')
  }

  const paymentData = payment as any
  const validation = canCancelPayment({
    ...paymentData,
    status: paymentData.status,
  } as any)

  if (!validation.canCancel) {
    throw new Error(validation.reason || 'Payment cannot be cancelled')
  }

  return await transitionPayment(
    paymentId,
    PAYMENT_STATUS.CANCELLED,
    reason || 'Cancelled by admin',
    user.id,
    request as any
  )
}

