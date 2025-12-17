/**
 * Payment Domain Model
 * Core domain logic for payment operations
 */

export interface Payment {
  id: string
  idempotencyKey: string
  userId?: string
  organizationId?: string
  amount: number
  amountPaid: number
  currency: string
  provider: string
  providerPaymentId?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'
  paymentMethod: string
  allowsPartial: boolean
  minPartialAmount?: number
  expiresAt?: Date
  cancelledAt?: Date
  cancelledBy?: string
  cancellationReason?: string
  metadata?: Record<string, any>
  webhookReceivedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PaymentTransaction {
  id: string
  paymentId: string
  transactionType: 'payment' | 'refund' | 'adjustment'
  amount: number
  currency: string
  provider: string
  providerTransactionId?: string
  status: 'pending' | 'completed' | 'failed'
  metadata?: Record<string, any>
  createdAt: Date
}

/**
 * Calculate remaining amount to be paid
 */
export function calculateRemainingAmount(payment: Payment): number {
  const remaining = payment.amount - payment.amountPaid
  return Math.max(0, remaining) // Never negative
}

/**
 * Check if payment is complete (fully paid)
 */
export function isPaymentComplete(payment: Payment): boolean {
  return payment.amountPaid >= payment.amount
}

/**
 * Check if payment can accept a partial payment
 */
export function canAcceptPartialPayment(payment: Payment, amount: number): {
  canAccept: boolean
  reason?: string
} {
  // Check if payment allows partial payments
  if (!payment.allowsPartial) {
    return {
      canAccept: false,
      reason: 'Payment does not allow partial payments',
    }
  }

  // Check if payment is in a valid state
  if (payment.status === 'completed' || payment.status === 'refunded' || payment.status === 'cancelled') {
    return {
      canAccept: false,
      reason: `Payment is in ${payment.status} state and cannot accept partial payments`,
    }
  }

  // Check minimum partial amount
  if (payment.minPartialAmount && amount < payment.minPartialAmount) {
    return {
      canAccept: false,
      reason: `Amount ${amount} is less than minimum partial amount ${payment.minPartialAmount}`,
    }
  }

  // Check if amount exceeds remaining
  const remaining = calculateRemainingAmount(payment)
  if (amount > remaining) {
    return {
      canAccept: false,
      reason: `Amount ${amount} exceeds remaining amount ${remaining}`,
    }
  }

  // Check if amount is positive
  if (amount <= 0) {
    return {
      canAccept: false,
      reason: 'Amount must be greater than 0',
    }
  }

  return { canAccept: true }
}

/**
 * Check if payment has expired
 */
export function isPaymentExpired(payment: Payment): boolean {
  if (!payment.expiresAt) {
    return false
  }

  return new Date() > payment.expiresAt
}

/**
 * Check if payment can be retried
 */
export function canRetryPayment(payment: Payment): {
  canRetry: boolean
  reason?: string
} {
  if (payment.status !== 'failed') {
    return {
      canRetry: false,
      reason: `Payment is in ${payment.status} state and cannot be retried`,
    }
  }

  if (isPaymentTerminalState(payment.status)) {
    return {
      canRetry: false,
      reason: 'Payment is in a terminal state',
    }
  }

  return { canRetry: true }
}

/**
 * Check if payment can be cancelled
 */
export function canCancelPayment(payment: Payment): {
  canCancel: boolean
  reason?: string
} {
  if (payment.status === 'completed') {
    return {
      canCancel: false,
      reason: 'Completed payments cannot be cancelled (use refund instead)',
    }
  }

  if (payment.status === 'refunded' || payment.status === 'cancelled') {
    return {
      canCancel: false,
      reason: `Payment is already ${payment.status}`,
    }
  }

  return { canCancel: true }
}

/**
 * Check if payment can be refunded
 */
export function canRefundPayment(payment: Payment): {
  canRefund: boolean
  reason?: string
} {
  if (payment.status !== 'completed') {
    return {
      canRefund: false,
      reason: `Payment must be completed to refund, current status: ${payment.status}`,
    }
  }

  if (payment.amountPaid <= 0) {
    return {
      canRefund: false,
      reason: 'No amount has been paid to refund',
    }
  }

  return { canRefund: true }
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
  if (payment.amount <= 0) {
    errors.push('Payment amount must be greater than 0')
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
  if (payment.expiresAt && payment.expiresAt < payment.createdAt) {
    errors.push('Expiration date cannot be before creation date')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Helper function from state-machine (to avoid circular dependency)
function isPaymentTerminalState(status: string): boolean {
  return ['refunded', 'cancelled'].includes(status)
}

