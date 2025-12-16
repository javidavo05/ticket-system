import { NextRequest } from 'next/server'
import { getPaymentProvider } from './gateway'
import { PAYMENT_PROVIDERS } from '@/lib/utils/constants'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/security/audit'

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

  // Update payment status
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({
      status: result.status,
      provider_payment_id: result.providerPaymentId,
      webhook_received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_payment_id', result.providerPaymentId)
    .select()
    .single()

  if (paymentError) {
    console.error('Error updating payment:', paymentError)
    throw paymentError
  }

  if (!payment) {
    throw new Error('Payment not found')
  }

  // Update ticket status if payment is completed
  if (result.status === 'completed') {
    const { error: ticketError } = await supabase
      .from('tickets')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment.id)
      .eq('status', 'pending_payment')

    if (ticketError) {
      console.error('Error updating tickets:', ticketError)
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

  // Log audit event
  await logAuditEvent(
    {
      userId: payment.user_id || undefined,
      action: 'payment_webhook_processed',
      resourceType: 'payment',
      resourceId: payment.id,
      metadata: {
        provider,
        status: result.status,
        providerPaymentId: result.providerPaymentId,
      },
    },
    request
  )
}

