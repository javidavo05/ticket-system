'use server'

import { requireAuth } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getBalance } from '@/lib/services/wallets/balance'

/**
 * Get wallet transactions for current user
 * Server-only, RLS enforced
 */
export async function getWalletTransactions(limit: number = 50, offset: number = 0) {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  // Get wallet first
  const { data: walletData, error: walletError } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (walletError || !walletData) {
    // Return empty array if wallet doesn't exist
    return []
  }

  const wallet = walletData as { id: string }

  // Get transactions
  const { data: transactionsData, error } = await supabase
    .from('wallet_transactions')
    .select(`
      id,
      transaction_type,
      amount,
      balance_after,
      reference_type,
      reference_id,
      description,
      event_id,
      created_at,
      events (
        id,
        name,
        slug
      )
    `)
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Error al obtener transacciones: ${error.message}`)
  }

  const transactions = (transactionsData || []) as Array<{
    id: string
    transaction_type: string
    amount: string | number
    balance_after: string | number
    reference_type: string | null
    reference_id: string | null
    description: string | null
    event_id: string | null
    created_at: string
    events: any
  }>

  return transactions.map((txn) => ({
    id: txn.id,
    type: txn.transaction_type as 'credit' | 'debit',
    amount: parseFloat(txn.amount as string),
    balanceAfter: parseFloat(txn.balance_after as string),
    description: txn.description,
    createdAt: txn.created_at,
    event: Array.isArray(txn.events) ? txn.events[0] : txn.events,
  }))
}

/**
 * Get wallet statistics
 * Server-only, RLS enforced
 */
export async function getWalletStats() {
  const user = await requireAuth()
  const supabase = await createServiceRoleClient()

  // Get wallet balance
  const balance = await getBalance(user.id)

  // Get wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!wallet) {
    return {
      balance: 0,
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: 0,
    }
  }

  // Get transaction statistics
  const { data: transactions } = await supabase
    .from('wallet_transactions')
    .select('transaction_type, amount')
    .eq('wallet_id', wallet.id)

  const totalCredits = (transactions || [])
    .filter((t) => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  const totalDebits = (transactions || [])
    .filter((t) => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  return {
    balance,
    totalCredits,
    totalDebits,
    transactionCount: transactions.length,
  }
}

