import { createServiceRoleClient } from '@/lib/supabase/server'
import { checkIdempotency, createIdempotencyKey } from './idempotency'
import { getDefaultPaymentProvider } from './gateway'
import { PAYMENT_STATUS } from '@/lib/utils/constants'
import { validatePaymentAmount, validatePaymentIntegrity } from './security'
import { transitionPayment } from './state-machine'
import { calculateRemainingAmount, isPaymentComplete } from './domain'
import type { CreatePaymentParams } from './gateway'

export interface CreatePaymentOptions {
  userId?: string
  organizationId?: string
  amount: number
  currency?: string
  provider?: string
  paymentMethod?: string
  allowsPartial?: boolean
  minPartialAmount?: number
  expiresAt?: Date
  description?: string
  metadata?: Record<string, any>
  idempotencyKey?: string
  items?: Array<{
    ticketTypeId?: string
    itemType: 'ticket' | 'wallet_reload' | 'refund'
    amount: number
    quantity: number
  }>
}

export interface PaymentCreationResult {
  paymentId: string
  sessionId?: string
  redirectUrl?: string
  paymentUrl?: string
  qrCode?: string
  expiresAt?: Date
}

/**
 * Create a new payment with full validation and idempotency
 */
export async function createPayment(
  options: CreatePaymentOptions
): Promise<PaymentCreationResult> {
  const supabase = await createServiceRoleClient()

  // Validate amount
  const amountValidation = validatePaymentAmount(options.amount, options.currency || 'USD')
  if (!amountValidation.isValid) {
    throw new Error(amountValidation.error || 'Invalid payment amount')
  }

  // Generate or use provided idempotency key
  const idempotencyKey = options.idempotencyKey || (await createIdempotencyKey())

  // Check idempotency
  const existingPaymentId = await checkIdempotency(idempotencyKey)
  if (existingPaymentId) {
    // Payment already exists, return existing payment info
    const { data: existingPayment } = await (supabase
      .from('payments')
      .select('id, provider_payment_id, status')
      .eq('id', existingPaymentId)
      .single() as any)

    if (existingPayment) {
      const existingPaymentData = existingPayment as any
      return {
        paymentId: existingPaymentData.id,
      }
    }
  }

  // Get payment provider
  const providerName = options.provider || process.env.DEFAULT_PAYMENT_PROVIDER || 'yappy'
  const paymentProvider = getDefaultPaymentProvider()

  // Calculate expiration (default 24 hours if not provided)
  const expiresAt = options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)

  // Create payment record
  const { data: payment, error: paymentError } = await ((supabase
    .from('payments') as any)
    .insert({
      idempotency_key: idempotencyKey,
      user_id: options.userId || null,
      organization_id: options.organizationId || null,
      amount: options.amount.toFixed(2),
      amount_paid: '0',
      currency: options.currency || 'USD',
      provider: providerName as any,
      status: PAYMENT_STATUS.PENDING,
      payment_method: (options.paymentMethod || 'card') as any,
      allows_partial: options.allowsPartial || false,
      min_partial_amount: options.minPartialAmount ? options.minPartialAmount.toFixed(2) : null,
      expires_at: expiresAt.toISOString(),
      metadata: options.metadata || {},
    })
    .select()
    .single())

  if (paymentError || !payment) {
    throw new Error(`Failed to create payment: ${paymentError?.message}`)
  }

  const paymentData = payment as any

  // Create payment items if provided
  if (options.items && options.items.length > 0) {
    const items = options.items.map((item) => ({
      payment_id: paymentData.id,
      ticket_id: null,
      item_type: item.itemType as any,
      amount: item.amount.toFixed(2),
      quantity: item.quantity,
    }))

    const { error: itemsError } = await ((supabase.from('payment_items') as any).insert(items))

    if (itemsError) {
      // Rollback payment creation
      await ((supabase.from('payments') as any).delete().eq('id', paymentData.id))
      throw new Error(`Failed to create payment items: ${itemsError.message}`)
    }
  }

  // Create payment session with provider
  try {
    const session = await paymentProvider.createPaymentSession({
      amount: options.amount,
      currency: options.currency || 'USD',
      description: options.description,
      metadata: {
        ...options.metadata,
        paymentId: paymentData.id,
        idempotencyKey,
      },
      returnUrl: options.metadata?.returnUrl,
      cancelUrl: options.metadata?.cancelUrl,
    })

    // Update payment with provider payment ID if available
    if (session.sessionId) {
      await ((supabase
        .from('payments') as any)
        .update({
          provider_payment_id: session.sessionId,
        })
        .eq('id', paymentData.id))
    }

    return {
      paymentId: paymentData.id,
      sessionId: session.sessionId,
      redirectUrl: session.redirectUrl,
      paymentUrl: session.paymentUrl,
      qrCode: session.qrCode,
      expiresAt: session.expiresAt || expiresAt,
    }
  } catch (error) {
    // If session creation fails, mark payment as failed
    await transitionPayment(paymentData.id, PAYMENT_STATUS.FAILED, 'Failed to create payment session', undefined)
    throw error
  }
}

/**
 * Create a partial payment for an existing payment
 */
export async function createPartialPayment(
  paymentId: string,
  amount: number,
  provider?: string
): Promise<PaymentCreationResult> {
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

  // Import domain functions
  const { canAcceptPartialPayment, calculateRemainingAmount } = await import('./domain')

  // Validate partial payment
  const validation = canAcceptPartialPayment(
    {
      ...paymentData,
      amountPaid: parseFloat(paymentData.amount_paid as string),
      allowsPartial: paymentData.allows_partial,
      minPartialAmount: paymentData.min_partial_amount ? parseFloat(paymentData.min_partial_amount as string) : undefined,
      status: paymentData.status as any,
    },
    amount
  )

  if (!validation.canAccept) {
    throw new Error(validation.reason || 'Cannot accept partial payment')
  }

  // Validate amount
  const amountValidation = validatePaymentAmount(amount, paymentData.currency as string)
  if (!amountValidation.isValid) {
    throw new Error(amountValidation.error || 'Invalid payment amount')
  }

  // Get payment provider
  const providerName = provider || paymentData.provider
  const paymentProvider = getDefaultPaymentProvider()

  // Create payment transaction record
  const { data: transaction, error: transactionError } = await ((supabase
    .from('payment_transactions') as any)
    .insert({
      payment_id: paymentId,
      transaction_type: 'payment',
      amount: amount.toFixed(2),
      currency: paymentData.currency as string,
      provider: providerName,
      status: 'pending',
      organization_id: paymentData.organization_id || null,
      metadata: {
        partialPayment: true,
        originalPaymentId: paymentId,
      },
    })
    .select()
    .single())

  if (transactionError || !transaction) {
    throw new Error(`Failed to create payment transaction: ${transactionError?.message}`)
  }

  const transactionData = transaction as any

  // Create payment session
  try {
    const session = await paymentProvider.createPaymentSession({
      amount,
      currency: paymentData.currency as string,
      description: `Partial payment for payment ${paymentId}`,
      metadata: {
        paymentId,
        transactionId: transactionData.id,
        partialPayment: true,
      },
    })

    // Update transaction with provider transaction ID
    if (session.sessionId) {
      await ((supabase
        .from('payment_transactions') as any)
        .update({
          provider_transaction_id: session.sessionId,
        })
        .eq('id', transactionData.id))
    }

    return {
      paymentId,
      sessionId: session.sessionId,
      redirectUrl: session.redirectUrl,
      paymentUrl: session.paymentUrl,
      qrCode: session.qrCode,
      expiresAt: session.expiresAt,
    }
  } catch (error) {
    // Mark transaction as failed
    await ((supabase
      .from('payment_transactions') as any)
      .update({ status: 'failed' })
      .eq('id', transactionData.id))

    throw error
  }
}

