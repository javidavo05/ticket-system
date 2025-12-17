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
  let { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_payment_id', result.providerPaymentId)
    .single()

  // If not found by provider_payment_id, try to find by payment ID in metadata
  if (paymentError && result.metadata?.paymentId) {
    const { data: paymentById } = await supabase
      .from('payments')
      .select('*')
      .eq('id', result.metadata.paymentId)
      .single()
    
    if (paymentById) {
      payment = paymentById
      paymentError = null
    }
  }

  if (paymentError || !payment) {
    console.error('Error finding payment:', paymentError)
    throw new Error(`Payment not found for provider payment ID: ${result.providerPaymentId}`)
  }

  // Check idempotency: verify this webhook hasn't been processed before
  // by checking if a transaction with this provider_transaction_id already exists
  if (result.providerPaymentId) {
    const { data: existingTransaction } = await supabase
      .from('payment_transactions')
      .select('id')
      .eq('provider_transaction_id', result.providerPaymentId)
      .eq('status', 'completed')
      .single()

    if (existingTransaction) {
      // Webhook already processed, return early (idempotent)
      console.log(`Webhook already processed for provider payment ID: ${result.providerPaymentId}`)
      return
    }
  }

  // Create payment transaction record
  const transactionAmount = result.metadata?.amount || parseFloat(payment.amount as string)
  const { data: transaction, error: transactionError } = await supabase
    .from('payment_transactions')
    .insert({
      payment_id: payment.id,
      transaction_type: 'payment',
      amount: transactionAmount.toFixed(2),
      currency: payment.currency as string,
      provider: provider,
      provider_transaction_id: result.providerPaymentId || undefined,
      status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'pending',
      organization_id: payment.organization_id || null,
      metadata: {
        webhookReceived: true,
        webhookReceivedAt: new Date().toISOString(),
        ...result.metadata,
      },
    })
    .select()
    .single()

  if (transactionError) {
    console.error('Error creating payment transaction:', transactionError)
    // Continue processing even if transaction creation fails
  }

  // Calculate new amount_paid if transaction was completed
  let newAmountPaid = parseFloat(payment.amount_paid as string)
  if (result.status === 'completed' && transaction) {
    newAmountPaid += transactionAmount
    // Ensure amount_paid doesn't exceed total
    const totalAmount = parseFloat(payment.amount as string)
    newAmountPaid = Math.min(newAmountPaid, totalAmount)
  }

  // Use state machine to transition payment status
  const currentStatus = payment.status
  let targetStatus = result.status

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
    provider_payment_id: result.providerPaymentId || payment.provider_payment_id,
    webhook_received_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (result.status === 'completed') {
    updateData.amount_paid = newAmountPaid.toFixed(2)
  }

  // Update payment before transitioning (to ensure data consistency)
  const { error: updateError } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', payment.id)

  if (updateError) {
    console.error('Error updating payment:', updateError)
    throw updateError
  }

  // Transition payment status using state machine
  if (currentStatus !== targetStatus) {
    try {
      await transitionPayment(
        payment.id,
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
    const totalAmount = parseFloat(payment.amount as string)
    const isFullyPaid = newAmountPaid >= totalAmount

    if (isFullyPaid) {
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', payment.id)
        .in('status', ['pending_payment', 'issued'])

      if (ticketError) {
        console.error('Error updating tickets:', ticketError)
      } else {
        // Send ticket delivery emails (non-blocking)
        try {
          await sendTicketsForPayment(payment.id)
        } catch (emailError) {
          // Log but don't fail webhook if email sending fails
          console.error('Error sending ticket emails:', emailError)
        }
      }
    } else {
      // Partial payment - tickets remain in pending_payment or issued state
      console.log(`Payment ${payment.id} partially paid: ${newAmountPaid}/${totalAmount}`)
    }

    // Update wallet balance if user exists
    if (payment.user_id) {
      const { data: paymentItems } = await supabase
        .from('payment_items')
        .select('*')
        .eq('payment_id', payment.id)
        .eq('item_type', 'wallet_reload')

      if (paymentItems && paymentItems.length > 0) {
        const totalReload = paymentItems.reduce((sum, item) => {
          return sum + parseFloat(item.amount as string)
        }, 0)

        if (totalReload > 0) {
          // Update wallet balance
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', payment.user_id)
            .single()

          if (wallet) {
            const newBalance = parseFloat(wallet.balance as string) + totalReload
            await supabase
              .from('wallets')
              .update({
                balance: newBalance.toString(),
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', payment.user_id)
          }
        }
      }
    }
  }

  // Verify reconciliation
  try {
    const reconciliation = await verifyPaymentReconciliation(payment.id)
    if (!reconciliation.isReconciled) {
      console.warn(`Payment ${payment.id} reconciliation issues:`, reconciliation.errors)
    }
  } catch (reconciliationError) {
    console.error('Error verifying payment reconciliation:', reconciliationError)
    // Don't fail webhook if reconciliation check fails
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: payment.user_id || undefined,
      action: 'payment_webhook_processed',
      resourceType: 'payment',
      resourceId: payment.id,
      organizationId: payment.organization_id || undefined,
      metadata: {
        provider,
        status: result.status,
        providerPaymentId: result.providerPaymentId,
        transactionId: transaction?.id,
        amountPaid: newAmountPaid,
        totalAmount: parseFloat(payment.amount as string),
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
  let { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_payment_id', result.providerPaymentId)
    .single()

  if (!payment && result.metadata?.paymentId) {
    const { data: paymentById } = await supabase
      .from('payments')
      .select('*')
      .eq('id', result.metadata.paymentId)
      .single()
    
    if (paymentById) {
      payment = paymentById
    }
  }

  if (!payment) {
    throw new Error(`Payment not found for partial payment: ${result.providerPaymentId}`)
  }

  // Check if transaction already exists (idempotency)
  const { data: existingTransaction } = await supabase
    .from('payment_transactions')
    .select('id')
    .eq('provider_transaction_id', result.providerPaymentId)
    .eq('status', 'completed')
    .single()

  if (existingTransaction) {
    console.log(`Partial payment webhook already processed: ${result.providerPaymentId}`)
    return
  }

  // Get transaction amount from payload or metadata
  const transactionAmount = result.metadata?.amount || parseFloat(payment.amount as string)

  // Create payment transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('payment_transactions')
    .insert({
      payment_id: payment.id,
      transaction_type: 'payment',
      amount: transactionAmount.toFixed(2),
      currency: payment.currency as string,
      provider: provider,
      provider_transaction_id: result.providerPaymentId || undefined,
      status: result.status === 'completed' ? 'completed' : 'pending',
      organization_id: payment.organization_id || null,
      metadata: {
        partialPayment: true,
        webhookReceived: true,
        ...result.metadata,
      },
    })
    .select()
    .single()

  if (transactionError || !transaction) {
    throw new Error(`Failed to create payment transaction: ${transactionError?.message}`)
  }

  // Update amount_paid
  const currentAmountPaid = parseFloat(payment.amount_paid as string)
  const newAmountPaid = currentAmountPaid + transactionAmount
  const totalAmount = parseFloat(payment.amount as string)

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
  if (payment.status === PAYMENT_STATUS.PENDING) {
    await transitionPayment(
      payment.id,
      PAYMENT_STATUS.PROCESSING,
      'Partial payment received',
      undefined,
      request
    )
  }

  // Check if payment is now complete
  if (newAmountPaid >= totalAmount) {
    await transitionPayment(
      payment.id,
      PAYMENT_STATUS.COMPLETED,
      'Payment completed via partial payments',
      undefined,
      request
    )
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', payment.id)

  if (updateError) {
    throw new Error(`Failed to update payment: ${updateError.message}`)
  }

  // Update tickets if fully paid
  if (newAmountPaid >= totalAmount) {
    const { error: ticketError } = await supabase
      .from('tickets')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment.id)
      .in('status', ['pending_payment', 'issued'])

    if (!ticketError) {
      try {
        await sendTicketsForPayment(payment.id)
      } catch (emailError) {
        console.error('Error sending ticket emails:', emailError)
      }
    }
  }

  // Log audit event
  await logAuditEvent(
    {
      userId: payment.user_id || undefined,
      action: 'partial_payment_webhook_processed',
      resourceType: 'payment',
      resourceId: payment.id,
      organizationId: payment.organization_id || undefined,
      metadata: {
        provider,
        transactionId: transaction.id,
        amount: transactionAmount,
        newAmountPaid: newAmountPaid,
        totalAmount,
      },
    },
    request
  )
}

