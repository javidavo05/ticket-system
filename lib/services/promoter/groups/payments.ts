/**
 * Promoter Groups Payments Service
 * Handles payment creation and tracking for ticket groups
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { validatePromoterAccess } from './validation'
import { createPayment } from '@/lib/services/payments/creation'
import { PAYMENT_STATUS } from '@/lib/utils/constants'
import { transitionPayment } from '@/lib/services/payments/state-machine'

export interface GroupPaymentStatus {
  groupId: string
  totalAmount: number
  amountPaid: number
  remainingAmount: number
  isComplete: boolean
  allowsPartial: boolean
  paymentId?: string
  paymentStatus?: string
  transactions: Array<{
    id: string
    amount: number
    status: string
    createdAt: string
  }>
}

/**
 * Create a payment for a ticket group
 */
export async function createGroupPayment(
  groupId: string,
  promoterId: string,
  amount: number,
  provider: string,
  method: string
): Promise<{ paymentId: string; redirectUrl?: string; paymentUrl?: string }> {
  // Validate promoter access
  const accessValidation = await validatePromoterAccess(promoterId, groupId)
  if (!accessValidation.isValid) {
    throw new ValidationError(accessValidation.reason || 'Access denied')
  }

  const supabase = await createServiceRoleClient()

  // Get group info
  const { data: group, error: groupError } = await supabase
    .from('ticket_groups')
    .select('total_amount, amount_paid, allows_partial, min_partial_amount, organization_id, payment_id')
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    throw new NotFoundError('Ticket group')
  }

  // Validate amount
  const totalAmount = parseFloat(group.total_amount as string)
  const amountPaid = parseFloat(group.amount_paid as string)
  const remainingAmount = totalAmount - amountPaid

  if (amount <= 0) {
    throw new ValidationError('Payment amount must be greater than 0')
  }

  if (amount > remainingAmount) {
    throw new ValidationError(
      `Payment amount (${amount}) exceeds remaining amount (${remainingAmount})`
    )
  }

  if (!group.allows_partial && amount < remainingAmount) {
    throw new ValidationError('Full payment required. Partial payments not allowed.')
  }

  if (group.min_partial_amount) {
    const minAmount = parseFloat(group.min_partial_amount as string)
    if (amount < minAmount) {
      throw new ValidationError(
        `Payment amount must be at least ${minAmount}. Minimum partial amount required.`
      )
    }
  }

  // Use existing payment or create new one
  let paymentId = group.payment_id

  if (!paymentId) {
    // Create new payment
    const paymentResult = await createPayment({
      userId: promoterId,
      organizationId: group.organization_id || undefined,
      amount: totalAmount,
      currency: 'USD',
      provider: provider as any,
      paymentMethod: method as any,
      allowsPartial: group.allows_partial,
      minPartialAmount: group.min_partial_amount
        ? parseFloat(group.min_partial_amount as string)
        : undefined,
      description: `Payment for ticket group ${groupId}`,
      metadata: {
        groupId,
        type: 'group_payment',
      },
    })

    paymentId = paymentResult.paymentId

    // Link payment to group
    const { error: linkError } = await supabase
      .from('ticket_groups')
      .update({
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', groupId)

    if (linkError) {
      throw new Error(`Failed to link payment to group: ${linkError.message}`)
    }
  }

  return {
    paymentId,
    redirectUrl: undefined, // Will be set by payment provider
    paymentUrl: undefined, // Will be set by payment provider
  }
}

/**
 * Record a partial payment for a group
 */
export async function recordPartialPayment(
  groupId: string,
  amount: number,
  transactionId: string,
  provider: string
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get group info
  const { data: group, error: groupError } = await supabase
    .from('ticket_groups')
    .select('total_amount, amount_paid, payment_id, allows_partial')
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    throw new NotFoundError('Ticket group')
  }

  if (!group.payment_id) {
    throw new ValidationError('Group does not have a payment record')
  }

  // Validate amount
  const totalAmount = parseFloat(group.total_amount as string)
  const currentAmountPaid = parseFloat(group.amount_paid as string)
  const newAmountPaid = currentAmountPaid + amount

  if (newAmountPaid > totalAmount) {
    throw new ValidationError(
      `Partial payment would exceed total amount: ${newAmountPaid} > ${totalAmount}`
    )
  }

  // Create payment transaction
  const { error: transactionError } = await supabase.from('payment_transactions').insert({
    payment_id: group.payment_id,
    transaction_type: 'payment',
    amount: amount.toFixed(2),
    currency: 'USD',
    provider: provider,
    provider_transaction_id: transactionId,
    status: 'completed',
    organization_id: group.organization_id || null,
    metadata: {
      groupId,
      partialPayment: true,
    },
  })

  if (transactionError) {
    throw new Error(`Failed to create payment transaction: ${transactionError.message}`)
  }

  // Update group amount_paid
  const { error: updateError } = await supabase
    .from('ticket_groups')
    .update({
      amount_paid: newAmountPaid.toFixed(2),
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)

  if (updateError) {
    throw new Error(`Failed to update group payment: ${updateError.message}`)
  }

  // Update payment amount_paid
  const { error: paymentUpdateError } = await supabase
    .from('payments')
    .update({
      amount_paid: newAmountPaid.toFixed(2),
      updated_at: new Date().toISOString(),
    })
    .eq('id', group.payment_id)

  if (paymentUpdateError) {
    throw new Error(`Failed to update payment: ${paymentUpdateError.message}`)
  }

  // Check if payment is complete
  if (newAmountPaid >= totalAmount) {
    // Update payment status to completed
    await transitionPayment(
      group.payment_id,
      PAYMENT_STATUS.COMPLETED,
      'Group payment completed',
      undefined
    )
  }
}

/**
 * Calculate payment status for a group
 */
export async function calculateGroupPaymentStatus(
  groupId: string
): Promise<GroupPaymentStatus> {
  const supabase = await createServiceRoleClient()

  // Get group info
  const { data: group, error: groupError } = await supabase
    .from('ticket_groups')
    .select('total_amount, amount_paid, allows_partial, payment_id')
    .eq('id', groupId)
    .single()

  if (groupError || !group) {
    throw new NotFoundError('Ticket group')
  }

  const totalAmount = parseFloat(group.total_amount as string)
  const amountPaid = parseFloat(group.amount_paid as string)
  const remainingAmount = totalAmount - amountPaid
  const isComplete = amountPaid >= totalAmount

  // Get payment transactions
  let transactions: GroupPaymentStatus['transactions'] = []

  if (group.payment_id) {
    const { data: paymentTransactions, error: transactionsError } = await supabase
      .from('payment_transactions')
      .select('id, amount, status, created_at')
      .eq('payment_id', group.payment_id)
      .order('created_at', { ascending: false })

    if (!transactionsError && paymentTransactions) {
      transactions = paymentTransactions.map((t) => ({
        id: t.id,
        amount: parseFloat(t.amount as string),
        status: t.status,
        createdAt: t.created_at,
      }))
    }

    // Get payment status
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('status')
      .eq('id', group.payment_id)
      .single()

    if (!paymentError && payment) {
      return {
        groupId,
        totalAmount,
        amountPaid,
        remainingAmount,
        isComplete,
        allowsPartial: group.allows_partial,
        paymentId: group.payment_id,
        paymentStatus: payment.status,
        transactions,
      }
    }
  }

  return {
    groupId,
    totalAmount,
    amountPaid,
    remainingAmount,
    isComplete,
    allowsPartial: group.allows_partial,
    paymentId: group.payment_id || undefined,
    transactions,
  }
}

/**
 * Check if group payment is complete
 */
export async function isGroupPaymentComplete(groupId: string): Promise<boolean> {
  const status = await calculateGroupPaymentStatus(groupId)
  return status.isComplete
}

