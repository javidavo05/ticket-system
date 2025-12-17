import { createServiceRoleClient } from '@/lib/supabase/server'
import { PAYMENT_STATUS } from '@/lib/utils/constants'
import { transitionPayment } from './state-machine'
import { calculateRemainingAmount, isPaymentComplete } from './domain'
import { logAuditEvent } from '@/lib/security/audit'
import type { NextRequest } from 'next/server'

/**
 * Reconcile a payment with provider transaction
 * Validates amount and updates payment status
 */
export async function reconcilePayment(
  paymentId: string,
  providerTransactionId: string,
  amount: number,
  confirmedBy?: string,
  request?: NextRequest
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

  // Find or create payment transaction
  let { data: transaction } = await (supabase
    .from('payment_transactions')
    .select('*')
    .eq('provider_transaction_id', providerTransactionId)
    .single() as any)

  if (!transaction) {
    // Create new transaction if not found
    const { data: newTransaction, error: createError } = await ((supabase
      .from('payment_transactions') as any)
      .insert({
        payment_id: paymentId,
        transaction_type: 'payment',
        amount: amount.toFixed(2),
        currency: paymentData.currency as string,
        provider: paymentData.provider as string,
        provider_transaction_id: providerTransactionId,
        status: 'completed',
        organization_id: paymentData.organization_id || null,
        metadata: {
          reconciled: true,
          reconciledBy: confirmedBy,
          reconciledAt: new Date().toISOString(),
        },
      })
      .select()
      .single())

    if (createError || !newTransaction) {
      throw new Error(`Failed to create payment transaction: ${createError?.message}`)
    }

    transaction = newTransaction
  } else {
    const transactionData = transaction as any
    // Update existing transaction
    const { error: updateError } = await ((supabase
      .from('payment_transactions') as any)
      .update({
        status: 'completed',
        metadata: {
          ...((transactionData.metadata as Record<string, any>) || {}),
          reconciled: true,
          reconciledBy: confirmedBy,
          reconciledAt: new Date().toISOString(),
        },
      })
      .eq('id', transactionData.id))

    if (updateError) {
      throw new Error(`Failed to update payment transaction: ${updateError.message}`)
    }
  }

  const transactionData = transaction as any
  // Validate amount matches
  const transactionAmount = parseFloat(transactionData.amount as string)
  if (Math.abs(transactionAmount - amount) > 0.01) {
    throw new Error(
      `Amount mismatch: transaction amount (${transactionAmount}) does not match provided amount (${amount})`
    )
  }

  // Calculate new amount_paid
  const currentAmountPaid = parseFloat(paymentData.amount_paid as string)
  const newAmountPaid = currentAmountPaid + transactionAmount

  // Validate new amount_paid doesn't exceed total
  const totalAmount = parseFloat(paymentData.amount as string)
  if (newAmountPaid > totalAmount) {
    throw new Error(
      `Amount paid (${newAmountPaid}) would exceed total amount (${totalAmount})`
    )
  }

  // Update payment
  const updateData: Record<string, any> = {
    amount_paid: newAmountPaid.toFixed(2),
    updated_at: new Date().toISOString(),
  }

  // Transition to processing if still pending
  if (paymentData.status === PAYMENT_STATUS.PENDING) {
    await transitionPayment(paymentId, PAYMENT_STATUS.PROCESSING, 'Payment transaction received', confirmedBy, request)
  }

  // Check if payment is now complete
  if (newAmountPaid >= totalAmount) {
    await transitionPayment(paymentId, PAYMENT_STATUS.COMPLETED, 'Payment fully reconciled', confirmedBy, request)
  }

  // Update amount_paid
  const { error: updateError } = await ((supabase
    .from('payments') as any)
    .update(updateData)
    .eq('id', paymentId))

  if (updateError) {
    throw new Error(`Failed to update payment: ${updateError.message}`)
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: confirmedBy || undefined,
      action: 'payment_reconciled',
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: {
        organizationId: paymentData.organization_id || undefined,
        providerTransactionId,
        amount: transactionAmount,
        newAmountPaid: newAmountPaid,
        totalAmount,
      },
    },
    request
  )
}

/**
 * Reconcile a bank transfer payment manually
 */
export async function reconcileBankTransfer(
  paymentId: string,
  referenceNumber: string,
  amount: number,
  confirmedBy: string,
  request?: NextRequest
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

  // Validate payment is bank transfer
  if (paymentData.provider !== 'bank_transfer') {
    throw new Error(`Payment is not a bank transfer, cannot reconcile manually`)
  }

  // Validate amount matches payment amount (for bank transfers, usually full amount)
  const totalAmount = parseFloat(paymentData.amount as string)
  const remaining = totalAmount - parseFloat(paymentData.amount_paid as string)

  if (Math.abs(amount - remaining) > 0.01 && Math.abs(amount - totalAmount) > 0.01) {
    throw new Error(
      `Amount ${amount} does not match remaining amount (${remaining}) or total amount (${totalAmount})`
    )
  }

  // Create payment transaction
  const { data: transaction, error: transactionError } = await ((supabase
    .from('payment_transactions') as any)
    .insert({
      payment_id: paymentId,
      transaction_type: 'payment',
      amount: amount.toFixed(2),
      currency: paymentData.currency as string,
      provider: 'bank_transfer',
      provider_transaction_id: referenceNumber,
      status: 'completed',
      organization_id: paymentData.organization_id || null,
      metadata: {
        referenceNumber,
        manualReconciliation: true,
        reconciledBy: confirmedBy,
        reconciledAt: new Date().toISOString(),
      },
    })
    .select()
    .single())

  if (transactionError || !transaction) {
    throw new Error(`Failed to create payment transaction: ${transactionError?.message}`)
  }

  // Update payment amount_paid
  const currentAmountPaid = parseFloat(paymentData.amount_paid as string)
  const newAmountPaid = currentAmountPaid + amount

  const { error: updateError } = await ((supabase
    .from('payments') as any)
    .update({
      amount_paid: newAmountPaid.toFixed(2),
      provider_payment_id: referenceNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId))

  if (updateError) {
    throw new Error(`Failed to update payment: ${updateError.message}`)
  }

  // Transition to completed if fully paid
  if (newAmountPaid >= totalAmount) {
    await transitionPayment(paymentId, PAYMENT_STATUS.COMPLETED, 'Bank transfer reconciled', confirmedBy, request)
  } else {
    // Transition to processing if partial
    if (paymentData.status === PAYMENT_STATUS.PENDING) {
      await transitionPayment(paymentId, PAYMENT_STATUS.PROCESSING, 'Bank transfer partially reconciled', confirmedBy, request)
    }
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: confirmedBy,
      action: 'bank_transfer_reconciled',
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: {
        organizationId: paymentData.organization_id || undefined,
        referenceNumber,
        amount,
        newAmountPaid: newAmountPaid,
        totalAmount,
      },
    },
    request
  )
}

