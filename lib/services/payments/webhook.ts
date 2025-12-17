import { NextRequest } from 'next/server'
import { getPaymentProvider } from './gateway'
import { PAYMENT_PROVIDERS, PAYMENT_STATUS } from '@/lib/utils/constants'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/security/audit'
import { sendTicketsForPayment } from './ticket-delivery'
import { transitionPayment } from './state-machine'
import { calculateRemainingAmount, isPaymentComplete } from './domain'
import { verifyPaymentReconciliation } from './security'

export async function verifyWebhook(
  provider: string,
  signature: string,
  payload: string
): Promise<boolean> {
  const paymentProvider = getPaymentProvider(provider)
  return paymentProvider.verifyWebhook(signature, payload)
}

export async function processPaymentWebhook(
  provider: string,
  payload: unknown,
  request: NextRequest
): Promise<void> {
  const paymentProvider = getPaymentProvider(provider)
  const result = await paymentProvider.processWebhook(payload)

  const supabase = await createServiceRoleClient()

  // Find payment by provider_payment_id or by idempotency key from metadata
  let { data: payment, error: paymentError } = result.providerPaymentId
    ? await (supabase
        .from('payments')
        .select('*')
        .eq('provider_payment_id', result.providerPaymentId)
        .single() as any)
    : { data: null, error: { message: 'No provider payment ID' } }

  // If not found by provider_payment_id, try to find by payment ID in metadata
  if (paymentError && result.metadata?.paymentId) {
    const { data: paymentById } = await (supabase
      .from('payments')
      .select('*')
      .eq('id', result.metadata.paymentId)
      .single() as any)
    
    if (paymentById) {
      payment = paymentById
      paymentError = null
    }
  }

  if (paymentError || !payment) {
    console.error('Error finding payment:', paymentError)
    throw new Error(`Payment not found for provider payment ID: ${result.providerPaymentId || 'unknown'}`)
  }

  const paymentData = payment as any

  // Check idempotency: verify this webhook hasn't been processed before
  // by checking if a transaction with this provider_transaction_id already exists
  if (result.providerPaymentId) {
    const { data: existingTransaction } = await (supabase
      .from('payment_transactions')
      .select('id')
      .eq('provider_transaction_id', result.providerPaymentId)
      .eq('status', 'completed')
      .single() as any)

    if (existingTransaction) {
      // Webhook already processed, return early (idempotent)
      console.log(`Webhook already processed for provider payment ID: ${result.providerPaymentId}`)
      return
    }
  }

  // Create payment transaction record
  const transactionAmount = typeof result.metadata?.amount === 'number' 
    ? result.metadata.amount 
    : parseFloat(paymentData.amount as string)
  const { data: transaction, error: transactionError } = await ((supabase
    .from('payment_transactions') as any)
    .insert({
      payment_id: paymentData.id,
      transaction_type: 'payment',
      amount: transactionAmount.toFixed(2),
      currency: paymentData.currency as string,
      provider: provider,
      provider_transaction_id: result.providerPaymentId || undefined,
      status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'pending',
      organization_id: paymentData.organization_id || null,
      metadata: {
        webhookReceived: true,
        webhookReceivedAt: new Date().toISOString(),
        ...result.metadata,
      },
    })
    .select()
    .single())

  if (transactionError) {
    console.error('Error creating payment transaction:', transactionError)
    // Continue processing even if transaction creation fails
  }

  // Calculate new amount_paid if transaction was completed
  let newAmountPaid = parseFloat(paymentData.amount_paid as string)
  if (result.status === 'completed' && transaction) {
    newAmountPaid += transactionAmount
    // Ensure amount_paid doesn't exceed total
    const totalAmount = parseFloat(paymentData.amount as string)
    newAmountPaid = Math.min(newAmountPaid, totalAmount)
  }

  // Use state machine to transition payment status
  const currentStatus = paymentData.status
  let targetStatus: string = result.status

  // Map webhook status to payment status
  if (result.status === 'completed') {
    targetStatus = PAYMENT_STATUS.COMPLETED
  } else if (result.status === 'failed') {
    targetStatus = PAYMENT_STATUS.FAILED
  } else if (result.status === 'pending') {
    targetStatus = PAYMENT_STATUS.PROCESSING
  }

  // Update payment with new status and amount_paid
  const updateData: Record<string, any> = {
    provider_payment_id: result.providerPaymentId || paymentData.provider_payment_id,
    webhook_received_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (result.status === 'completed') {
    updateData.amount_paid = newAmountPaid.toFixed(2)
  }

  // Update payment before transitioning (to ensure data consistency)
  const { error: updateError } = await ((supabase
    .from('payments') as any)
    .update(updateData)
    .eq('id', paymentData.id))

  if (updateError) {
    console.error('Error updating payment:', updateError)
    throw updateError
  }

  // Transition payment status using state machine
  if (currentStatus !== targetStatus) {
    try {
      await transitionPayment(
        paymentData.id,
        targetStatus,
        `Webhook received: ${result.status}`,
        undefined,
        request
      )
    } catch (transitionError) {
      console.error('Error transitioning payment status:', transitionError)
      // Continue processing even if transition fails
    }
  }

  // Update ticket status if payment is completed
  // Only update if payment is fully paid (amount_paid >= amount)
  if (result.status === 'completed') {
    const totalAmount = parseFloat(paymentData.amount as string)
    const isFullyPaid = newAmountPaid >= totalAmount

    if (isFullyPaid) {
      const { error: ticketError } = await ((supabase
        .from('tickets') as any)
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentData.id)
        .in('status', ['pending_payment', 'issued']))

      if (ticketError) {
        console.error('Error updating tickets:', ticketError)
      } else {
        // Send ticket delivery emails (non-blocking)
        try {
          await sendTicketsForPayment(paymentData.id)
        } catch (emailError) {
          // Log but don't fail webhook if email sending fails
          console.error('Error sending ticket emails:', emailError)
        }
      }
    } else {
      // Partial payment - tickets remain in pending_payment or issued state
      console.log(`Payment ${paymentData.id} partially paid: ${newAmountPaid}/${totalAmount}`)
    }

    // Update wallet balance if user exists
    if (paymentData.user_id) {
      const { data: paymentItems } = await (supabase
        .from('payment_items')
        .select('*')
        .eq('payment_id', paymentData.id)
        .eq('item_type', 'wallet_reload') as any)

      const paymentItemsData = (paymentItems || []) as any[]
      if (paymentItemsData.length > 0) {
        const totalReload = paymentItemsData.reduce((sum: number, item: any) => {
          return sum + parseFloat(item.amount as string)
        }, 0)

        if (totalReload > 0) {
          // Update wallet balance
          const { data: wallet } = await (supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', paymentData.user_id)
            .single() as any)

          if (wallet) {
            const walletData = wallet as any
            const newBalance = parseFloat(walletData.balance as string) + totalReload
            await ((supabase
              .from('wallets') as any)
              .update({
                balance: newBalance.toString(),
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', paymentData.user_id))
          }
        }
      }
    }
  }

  // Verify reconciliation
  try {
    const reconciliation = await verifyPaymentReconciliation(paymentData.id)
    if (!reconciliation.isReconciled) {
      console.warn(`Payment ${paymentData.id} reconciliation issues:`, reconciliation.errors)
    }
  } catch (reconciliationError) {
    console.error('Error verifying payment reconciliation:', reconciliationError)
    // Don't fail webhook if reconciliation check fails
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: paymentData.user_id || undefined,
      action: 'payment_webhook_processed',
      resourceType: 'payment',
      resourceId: paymentData.id,
      metadata: {
        organizationId: paymentData.organization_id || undefined,
        provider,
        status: result.status,
        providerPaymentId: result.providerPaymentId,
        transactionId: transaction?.id,
        amountPaid: newAmountPaid,
        totalAmount: parseFloat(paymentData.amount as string),
      },
    },
    request
  )
}

/**
 * Process partial payment webhook
 * Handles webhooks for partial payments specifically
 */
export async function processPartialPaymentWebhook(
  provider: string,
  payload: unknown,
  request: NextRequest
): Promise<void> {
  const paymentProvider = getPaymentProvider(provider)
  const result = await paymentProvider.processWebhook(payload)

  const supabase = await createServiceRoleClient()

  // Find payment by provider_payment_id or metadata
  let { data: payment } = result.providerPaymentId
    ? await (supabase
        .from('payments')
        .select('*')
        .eq('provider_payment_id', result.providerPaymentId)
        .single() as any)
    : { data: null }

  if (!payment && result.metadata?.paymentId) {
    const { data: paymentById } = await (supabase
      .from('payments')
      .select('*')
      .eq('id', result.metadata.paymentId)
      .single() as any)
    
    if (paymentById) {
      payment = paymentById
    }
  }

  if (!payment) {
    throw new Error(`Payment not found for partial payment: ${result.providerPaymentId || 'unknown'}`)
  }

  const paymentData = payment as any

  // Check if transaction already exists (idempotency)
  const { data: existingTransaction } = result.providerPaymentId
    ? await (supabase
        .from('payment_transactions')
        .select('id')
        .eq('provider_transaction_id', result.providerPaymentId)
        .eq('status', 'completed')
        .single() as any)
    : { data: null }

  if (existingTransaction) {
    console.log(`Partial payment webhook already processed: ${result.providerPaymentId}`)
    return
  }

  // Get transaction amount from payload or metadata
  const transactionAmount = typeof result.metadata?.amount === 'number' 
    ? result.metadata.amount 
    : parseFloat(paymentData.amount as string)

  // Create payment transaction
  const { data: transaction, error: transactionError } = await ((supabase
    .from('payment_transactions') as any)
    .insert({
      payment_id: paymentData.id,
      transaction_type: 'payment',
      amount: transactionAmount.toFixed(2),
      currency: paymentData.currency as string,
      provider: provider,
      provider_transaction_id: result.providerPaymentId || undefined,
      status: result.status === 'completed' ? 'completed' : 'pending',
      organization_id: paymentData.organization_id || null,
      metadata: {
        partialPayment: true,
        webhookReceived: true,
        ...result.metadata,
      },
    })
    .select()
    .single())

  if (transactionError || !transaction) {
    throw new Error(`Failed to create payment transaction: ${transactionError?.message}`)
  }

  const transactionData = transaction as any

  // Update amount_paid
  const currentAmountPaid = parseFloat(paymentData.amount_paid as string)
  const newAmountPaid = currentAmountPaid + transactionAmount
  const totalAmount = parseFloat(paymentData.amount as string)

  // Validate amount_paid doesn't exceed total
  if (newAmountPaid > totalAmount) {
    throw new Error(
      `Partial payment would exceed total: ${newAmountPaid} > ${totalAmount}`
    )
  }

  // Update payment
  const updateData: Record<string, any> = {
    amount_paid: newAmountPaid.toFixed(2),
    updated_at: new Date().toISOString(),
  }

  // Transition to processing if still pending
  if (paymentData.status === PAYMENT_STATUS.PENDING) {
    await transitionPayment(
      paymentData.id,
      PAYMENT_STATUS.PROCESSING,
      'Partial payment received',
      undefined,
      request
    )
  }

  // Check if payment is now complete
  if (newAmountPaid >= totalAmount) {
    await transitionPayment(
      paymentData.id,
      PAYMENT_STATUS.COMPLETED,
      'Payment completed via partial payments',
      undefined,
      request
    )
  }

  const { error: updateError } = await ((supabase
    .from('payments') as any)
    .update(updateData)
    .eq('id', paymentData.id))

  if (updateError) {
    throw new Error(`Failed to update payment: ${updateError.message}`)
  }

  // Update tickets if fully paid
  if (newAmountPaid >= totalAmount) {
    const { error: ticketError } = await ((supabase
      .from('tickets') as any)
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', paymentData.id)
      .in('status', ['pending_payment', 'issued']))

    if (!ticketError) {
      try {
        await sendTicketsForPayment(paymentData.id)
      } catch (emailError) {
        console.error('Error sending ticket emails:', emailError)
      }
    }
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: paymentData.user_id || undefined,
      action: 'partial_payment_webhook_processed',
      resourceType: 'payment',
      resourceId: paymentData.id,
      metadata: {
        organizationId: paymentData.organization_id || undefined,
        provider,
        transactionId: transactionData.id,
        amount: transactionAmount,
        newAmountPaid: newAmountPaid,
        totalAmount,
      },
    },
    request
  )
}

