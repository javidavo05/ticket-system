import { createServiceRoleClient } from '@/lib/supabase/server'
import { PAYMENT_STATUS } from '@/lib/utils/constants'
import { canRetryPayment } from './domain'
import { transitionPayment } from './state-machine'
import { getDefaultPaymentProvider } from './gateway'
import { createPartialPayment } from './creation'
import { logAuditEvent } from '@/lib/security/audit'
import type { NextRequest } from 'next/server'

const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_PAYMENT_RETRY_ATTEMPTS || '3')

/**
 * Retry a failed payment
 */
export async function retryPayment(
  paymentId: string,
  provider?: string,
  request?: NextRequest
): Promise<{
  success: boolean
  sessionId?: string
  redirectUrl?: string
  paymentUrl?: string
  error?: string
}> {
  const supabase = await createServiceRoleClient()

  // Get payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (paymentError || !payment) {
    throw new Error(`Payment not found: ${paymentId}`)
  }

  // Validate payment can be retried
  const validation = canRetryPayment({
    ...payment,
    status: payment.status as any,
  } as any)

  if (!validation.canRetry) {
    return {
      success: false,
      error: validation.reason || 'Payment cannot be retried',
    }
  }

  // Check retry attempts in metadata
  const metadata = (payment.metadata as Record<string, any>) || {}
  const retryAttempts = metadata.retryAttempts || 0

  if (retryAttempts >= MAX_RETRY_ATTEMPTS) {
    return {
      success: false,
      error: `Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached`,
    }
  }

  // Transition back to pending
  await transitionPayment(
    paymentId,
    PAYMENT_STATUS.PENDING,
    `Retry attempt ${retryAttempts + 1}`,
    undefined,
    request
  )

  // Calculate remaining amount
  const totalAmount = parseFloat(payment.amount as string)
  const amountPaid = parseFloat(payment.amount_paid as string)
  const remainingAmount = totalAmount - amountPaid

  // Create new payment session
  try {
    const paymentProvider = getDefaultPaymentProvider()
    const session = await paymentProvider.createPaymentSession({
      amount: remainingAmount,
      currency: payment.currency as string,
      description: `Retry payment for ${paymentId}`,
      metadata: {
        ...metadata,
        paymentId,
        retryAttempt: retryAttempts + 1,
        originalPaymentId: paymentId,
      },
    })

    // Update payment metadata with retry attempt
    await supabase
      .from('payments')
      .update({
        provider_payment_id: session.sessionId,
        metadata: {
          ...metadata,
          retryAttempts: retryAttempts + 1,
          lastRetryAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    // Log audit event
    await logAuditEvent(
      {
        userId: payment.user_id || undefined,
        action: 'payment_retry',
        resourceType: 'payment',
        resourceId: paymentId,
        organizationId: payment.organization_id || undefined,
        metadata: {
          retryAttempt: retryAttempts + 1,
          sessionId: session.sessionId,
        },
      },
      request
    )

    return {
      success: true,
      sessionId: session.sessionId,
      redirectUrl: session.redirectUrl,
      paymentUrl: session.paymentUrl,
    }
  } catch (error) {
    // Transition back to failed
    await transitionPayment(
      paymentId,
      PAYMENT_STATUS.FAILED,
      `Retry failed: ${error instanceof Error ? error.message : String(error)}`,
      undefined,
      request
    )

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Schedule a payment retry with delay
 */
export async function schedulePaymentRetry(
  paymentId: string,
  delayMinutes: number = 5
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Calculate retry time
  const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000)

  // Store retry schedule in payment metadata
  const { data: payment } = await supabase
    .from('payments')
    .select('metadata')
    .eq('id', paymentId)
    .single()

  if (payment) {
    const metadata = (payment.metadata as Record<string, any>) || {}
    await supabase
      .from('payments')
      .update({
        metadata: {
          ...metadata,
          retryScheduled: true,
          retryAt: retryAt.toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
  }

  // Note: Actual retry execution would be handled by a cron job
  // that checks for payments with retryAt <= now and status = 'failed'
}

