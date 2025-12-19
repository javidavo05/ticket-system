'use server'

import { requireAuth } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Get user's payment history
 * Server-only, RLS enforced
 */
export async function getUserPayments(limit: number = 50, offset: number = 0) {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  // Get payments where user is the payer
  const { data: payments, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      amount_paid,
      currency,
      status,
      provider,
      payment_method,
      created_at,
      updated_at,
      payment_items (
        id,
        item_type,
        amount,
        quantity,
        tickets (
          id,
          ticket_number,
          events!inner (
            id,
            name,
            slug
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Error al obtener historial de pagos: ${error.message}`)
  }

  const paymentsList = (payments || []) as Array<{
    id: string
    amount: string | number
    amount_paid: string | number | null
    currency: string
    status: string
    provider: string
    payment_method: string
    created_at: string
    [key: string]: any
  }>

  return paymentsList.map((payment) => ({
    id: payment.id,
    amount: parseFloat(payment.amount as string),
    amountPaid: parseFloat(payment.amount_paid as string || '0'),
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    paymentMethod: payment.payment_method,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
    items: Array.isArray(payment.payment_items) ? payment.payment_items : [],
  }))
}

/**
 * Get payment count for current user
 */
export async function getPaymentCount() {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  const { count, error } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Error al obtener conteo de pagos: ${error.message}`)
  }

  return count || 0
}

/**
 * Get payment details
 * Server-only, RLS enforced
 */
export async function getPaymentDetails(paymentId: string) {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  // Get payment and verify ownership
  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      payment_items (
        *,
        tickets (
          id,
          ticket_number,
          status,
          events!inner (
            id,
            name,
            slug,
            start_date
          )
        )
      ),
      payment_transactions (
        id,
        transaction_type,
        amount,
        status,
        provider,
        created_at
      )
    `)
    .eq('id', paymentId)
    .eq('user_id', user.id)
    .single()

  if (error || !payment) {
    throw new Error('Pago no encontrado o no tienes acceso')
  }

  const paymentData = payment as any

  return {
    ...paymentData,
    amount: parseFloat(paymentData.amount as string),
    amountPaid: parseFloat(paymentData.amount_paid as string || '0'),
    items: Array.isArray(paymentData.payment_items) ? paymentData.payment_items : [],
    transactions: Array.isArray(paymentData.payment_transactions) ? paymentData.payment_transactions : [],
  }
}

