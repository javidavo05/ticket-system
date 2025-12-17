import { createServiceRoleClient } from '@/lib/supabase/server'
import { PAYMENT_STATUS } from '@/lib/utils/constants'
import { logAuditEvent } from '@/lib/security/audit'
import type { NextRequest } from 'next/server'

/**
 * Valid state transitions for payments
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.PROCESSING, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.PROCESSING]: [PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED],
  [PAYMENT_STATUS.COMPLETED]: [PAYMENT_STATUS.REFUNDED],
  [PAYMENT_STATUS.FAILED]: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED], // Retry or cancel
  [PAYMENT_STATUS.REFUNDED]: [], // Terminal state
  [PAYMENT_STATUS.CANCELLED]: [], // Terminal state
}

/**
 * Terminal states that cannot transition to any other state
 */
const TERMINAL_STATES = [PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.CANCELLED]

/**
 * Check if a payment state transition is valid
 */
export function canTransitionPayment(fromStatus: string, toStatus: string): boolean {
  // Same state is always valid (idempotent)
  if (fromStatus === toStatus) {
    return true
  }

  // Terminal states cannot transition
  if (TERMINAL_STATES.includes(fromStatus)) {
    return false
  }

  const allowedTransitions = VALID_TRANSITIONS[fromStatus] || []
  return allowedTransitions.includes(toStatus)
}

/**
 * Get all valid transitions from a given payment status
 */
export function getValidPaymentTransitions(fromStatus: string): string[] {
  return VALID_TRANSITIONS[fromStatus] || []
}

/**
 * Check if a payment status is terminal
 */
export function isPaymentTerminalState(status: string): boolean {
  return TERMINAL_STATES.includes(status)
}

/**
 * Transition a payment to a new state
 * Validates the transition and updates the payment
 */
export async function transitionPayment(
  paymentId: string,
  newStatus: string,
  reason?: string,
  actorId?: string,
  request?: NextRequest
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get current payment state
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('id, status, amount, amount_paid, organization_id')
    .eq('id', paymentId)
    .single()

  if (fetchError || !payment) {
    throw new Error(`Payment not found: ${paymentId}`)
  }

  const currentStatus = payment.status

  // Validate transition
  if (!canTransitionPayment(currentStatus, newStatus)) {
    throw new Error(
      `Invalid payment state transition: ${currentStatus} → ${newStatus}. ` +
        `Valid transitions from ${currentStatus}: ${getValidPaymentTransitions(currentStatus).join(', ')}`
    )
  }

  // If same state, no update needed (idempotent)
  if (currentStatus === newStatus) {
    return
  }

  // Prepare update data (using snake_case for Supabase)
  const updateData: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  // Add cancellation metadata if transitioning to cancelled
  if (newStatus === PAYMENT_STATUS.CANCELLED) {
    updateData.cancelled_at = new Date().toISOString()
    if (actorId) {
      updateData.cancelled_by = actorId
    }
    if (reason) {
      updateData.cancellation_reason = reason
    }
  }

  // Update payment
  const { error: updateError } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)

  if (updateError) {
    throw new Error(`Failed to transition payment: ${updateError.message}`)
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: actorId || null,
      action: 'payment_state_transition',
      resourceType: 'payment',
      resourceId: paymentId,
      organizationId: payment.organization_id || undefined,
      changes: {
        from: currentStatus,
        to: newStatus,
        reason: reason || null,
      },
      metadata: {
        amount: payment.amount,
        amountPaid: payment.amount_paid,
      },
    },
    request
  )
}

/**
 * Batch transition multiple payments (e.g., for batch operations)
 */
export async function transitionPayments(
  paymentIds: string[],
  newStatus: string,
  reason?: string,
  actorId?: string,
  request?: NextRequest
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get current states
  const { data: payments, error: fetchError } = await supabase
    .from('payments')
    .select('id, status, organization_id')
    .in('id', paymentIds)

  if (fetchError || !payments) {
    throw new Error(`Failed to fetch payments: ${fetchError?.message}`)
  }

  // Validate all transitions
  for (const payment of payments) {
    if (!canTransitionPayment(payment.status, newStatus)) {
      throw new Error(
        `Invalid state transition for payment ${payment.id}: ` +
          `${payment.status} → ${newStatus}`
      )
    }
  }

  // Prepare update data
  const updateData: Record<string, any> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (newStatus === PAYMENT_STATUS.CANCELLED) {
    updateData.cancelled_at = new Date().toISOString()
    if (actorId) {
      updateData.cancelled_by = actorId
    }
    if (reason) {
      updateData.cancellation_reason = reason
    }
  }

  // Update all payments
  const { error: updateError } = await supabase
    .from('payments')
    .update(updateData)
    .in('id', paymentIds)

  if (updateError) {
    throw new Error(`Failed to transition payments: ${updateError.message}`)
  }

  // Log audit events for each payment
  for (const payment of payments) {
    await logAuditEvent(
      {
        userId: actorId || null,
        action: 'payment_state_transition',
        resourceType: 'payment',
        resourceId: payment.id,
        organizationId: payment.organization_id || undefined,
        changes: {
          from: payment.status,
          to: newStatus,
          reason: reason || null,
        },
        metadata: {
          batchTransition: true,
        },
      },
      request
    )
  }
}

