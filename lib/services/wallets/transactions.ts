import { createServiceRoleClient } from '@/lib/supabase/server'

export interface WalletTransaction {
  id: string
  transactionType: 'credit' | 'debit'
  amount: number
  balanceAfter: number
  referenceType: string
  description: string
  eventId?: string
  createdAt: string
}

export async function getTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<WalletTransaction[]> {
  const supabase = await createServiceRoleClient()

  const { data: transactions, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw error
  }

  return (transactions || []).map(t => ({
    id: t.id,
    transactionType: t.transaction_type as 'credit' | 'debit',
    amount: parseFloat(t.amount as string),
    balanceAfter: parseFloat(t.balance_after as string),
    referenceType: t.reference_type,
    description: t.description,
    eventId: t.event_id || undefined,
    createdAt: t.created_at,
  }))
}

export async function getTransactionById(transactionId: string, userId: string): Promise<WalletTransaction | null> {
  const supabase = await createServiceRoleClient()

  const { data: transaction, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single()

  if (error || !transaction) {
    return null
  }

  return {
    id: transaction.id,
    transactionType: transaction.transaction_type as 'credit' | 'debit',
    amount: parseFloat(transaction.amount as string),
    balanceAfter: parseFloat(transaction.balance_after as string),
    referenceType: transaction.reference_type,
    description: transaction.description,
    eventId: transaction.event_id || undefined,
    createdAt: transaction.created_at,
  }
}

