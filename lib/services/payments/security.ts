import { createServiceRoleClient } from '@/lib/supabase/server'
import type { Payment, PaymentTransaction } from './domain'
import { logAuditEvent } from '@/lib/security/audit'
import type { NextRequest } from 'next/server'

/**
 * Maximum payment amount (configurable via env)
 */
const MAX_PAYMENT_AMOUNT = parseFloat(process.env.MAX_PAYMENT_AMOUNT || '100000')
const MIN_PAYMENT_AMOUNT = parseFloat(process.env.MIN_PAYMENT_AMOUNT || '0.01')

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number, currency: string = 'USD'): {
  isValid: boolean
  error?: string
} {
  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Payment amount must be greater than 0',
    }
  }

  if (amount < MIN_PAYMENT_AMOUNT) {
    return {
      isValid: false,
      error: `Payment amount must be at least ${MIN_PAYMENT_AMOUNT} ${currency}`,
    }
  }

  if (amount > MAX_PAYMENT_AMOUNT) {
    return {
      isValid: false,
      error: `Payment amount exceeds maximum limit of ${MAX_PAYMENT_AMOUNT} ${currency}`,
    }
  }

  // Validate decimal places (max 2 for most currencies)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: 'Payment amount cannot have more than 2 decimal places',
    }
  }

  return { isValid: true }
}

/**
 * Validate payment integrity
 */
export function validatePaymentIntegrity(payment: Payment): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Amount validation
  const amountValidation = validatePaymentAmount(payment.amount, payment.currency)
  if (!amountValidation.isValid) {
    errors.push(amountValidation.error || 'Invalid payment amount')
  }

  // Amount paid validation
  if (payment.amountPaid < 0) {
    errors.push('Amount paid cannot be negative')
  }

  if (payment.amountPaid > payment.amount) {
    errors.push(`Amount paid (${payment.amountPaid}) exceeds total amount (${payment.amount})`)
  }

  // Partial payment validation
  if (payment.allowsPartial && payment.minPartialAmount) {
    if (payment.minPartialAmount <= 0) {
      errors.push('Minimum partial amount must be greater than 0')
    }
    if (payment.minPartialAmount > payment.amount) {
      errors.push('Minimum partial amount cannot exceed total amount')
    }
  }

  // Expiration validation
  if (payment.expiresAt && payment.createdAt && payment.expiresAt < payment.createdAt) {
    errors.push('Expiration date cannot be before creation date')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Verify payment reconciliation
 * Checks that amount_paid matches sum of completed transactions
 */
export async function verifyPaymentReconciliation(paymentId: string): Promise<{
  isReconciled: boolean
  discrepancy?: number
  errors: string[]
}> {
  const supabase = await createServiceRoleClient()
  const errors: string[] = []

  // Get payment
  const { data: payment, error: paymentError } = await (supabase
    .from('payments')
    .select('id, amount, amount_paid')
    .eq('id', paymentId)
    .single() as any)

  if (paymentError || !payment) {
    errors.push(`Payment not found: ${paymentId}`)
    return { isReconciled: false, errors }
  }

  const paymentData = payment as any

  // Get all completed payment transactions
  const { data: transactions, error: transactionsError } = await (supabase
    .from('payment_transactions')
    .select('amount, transaction_type, status')
    .eq('payment_id', paymentId)
    .eq('status', 'completed')
    .in('transaction_type', ['payment', 'adjustment']) as any)

  if (transactionsError) {
    errors.push(`Failed to fetch transactions: ${transactionsError.message}`)
    return { isReconciled: false, errors }
  }

  const transactionsData = (transactions || []) as any[]
  // Calculate sum of completed payment transactions
  const totalFromTransactions = transactionsData.reduce((sum, txn: any) => {
    if (txn.transaction_type === 'payment') {
      return sum + parseFloat(txn.amount as string)
    } else if (txn.transaction_type === 'adjustment') {
      return sum + parseFloat(txn.amount as string) // Adjustments can be positive or negative
    }
    return sum
  }, 0)

  // Compare with amount_paid
  const amountPaid = parseFloat(paymentData.amount_paid as string)
  const discrepancy = Math.abs(amountPaid - totalFromTransactions)

  // Allow small discrepancy due to rounding (0.01)
  const isReconciled = discrepancy < 0.01

  if (!isReconciled) {
    errors.push(
      `Payment reconciliation mismatch: amount_paid (${amountPaid}) does not match ` +
        `sum of transactions (${totalFromTransactions}), discrepancy: ${discrepancy}`
    )
  }

  return {
    isReconciled,
    discrepancy: discrepancy >= 0.01 ? discrepancy : undefined,
    errors,
  }
}

/**
 * Basic fraud detection checks
 */
export async function checkPaymentFraud(
  payment: Payment,
  metadata?: Record<string, any>
): Promise<{
  isSuspicious: boolean
  reasons: string[]
}> {
  const supabase = await createServiceRoleClient()
  const reasons: string[] = []

  // Check for multiple failed attempts from same user
  if (payment.userId) {
    const { data: recentFailures } = await (supabase
      .from('payments')
      .select('id')
      .eq('user_id', payment.userId)
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .limit(10) as any)

    const recentFailuresData = (recentFailures || []) as any[]
    if (recentFailuresData.length >= 5) {
      reasons.push('Multiple failed payment attempts in the last hour')
    }
  }

  // Check for unusual amount
  if (payment.amount > MAX_PAYMENT_AMOUNT * 0.9) {
    reasons.push('Payment amount is unusually high (90% of maximum)')
  }

  // Check for rapid payments from same IP (if metadata includes IP)
  if (metadata?.ipAddress) {
    const { data: recentPayments } = await (supabase
      .from('payments')
      .select('id')
      .eq('metadata->>ipAddress', metadata.ipAddress)
      .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
      .limit(10) as any)

    const recentPaymentsData = (recentPayments || []) as any[]
    if (recentPaymentsData.length >= 5) {
      reasons.push('Multiple payments from same IP in short time')
    }
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  }
}

/**
 * Log payment state change
 */
export async function logPaymentStateChange(
  payment: Payment,
  fromStatus: string,
  toStatus: string,
  reason?: string,
  request?: NextRequest
): Promise<void> {
  await logAuditEvent(
    {
      userId: payment.userId || undefined,
      action: 'payment_state_change',
      resourceType: 'payment',
      resourceId: payment.id,
      changes: {
        from: fromStatus,
        to: toStatus,
        reason: reason || null,
      },
      metadata: {
        organizationId: payment.organizationId || undefined,
        amount: payment.amount,
        amountPaid: payment.amountPaid,
        provider: payment.provider,
      },
    },
    request
  )
}

/**
 * Log payment transaction
 */
export async function logPaymentTransaction(
  transaction: PaymentTransaction,
  request?: NextRequest
): Promise<void> {
  await logAuditEvent(
    {
      userId: undefined,
      action: 'payment_transaction_created',
      resourceType: 'payment_transaction',
      resourceId: transaction.id,
      metadata: {
        paymentId: transaction.paymentId,
        type: transaction.transactionType,
        amount: transaction.amount,
        currency: transaction.currency,
        provider: transaction.provider,
        status: transaction.status,
      },
    },
    request
  )
}

