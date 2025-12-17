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
  sequenceNumber: number
  idempotencyKey?: string
  metadata?: Record<string, any>
  processedAt?: string
}

export async function getTransactions(
  userId: string,
  options?: {
    eventId?: string
    limit?: number
    offset?: number
    walletId?: string
  }
): Promise<WalletTransaction[]> {
  const supabase = await createServiceRoleClient()
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  let query = supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)

  if (options?.walletId) {
    query = query.eq('wallet_id', options.walletId)
  }

  if (options?.eventId) {
    query = query.eq('event_id', options.eventId)
  }

  const { data: transactions, error } = await query
    .order('sequence_number', { ascending: false })
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
    sequenceNumber: parseInt(t.sequence_number as string, 10),
    idempotencyKey: t.idempotency_key || undefined,
    metadata: (t.metadata as Record<string, any>) || undefined,
    processedAt: t.processed_at || undefined,
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
    sequenceNumber: parseInt(transaction.sequence_number as string, 10),
    idempotencyKey: transaction.idempotency_key || undefined,
    metadata: (transaction.metadata as Record<string, any>) || undefined,
    processedAt: transaction.processed_at || undefined,
  }
}

/**
 * Get event-scoped wallet balance for a user
 * @param userId - The user ID
 * @param eventId - The event ID
 * @returns The wallet balance for the event
 */
export async function getEventWalletBalance(userId: string, eventId: string): Promise<number> {
  const supabase = await createServiceRoleClient()

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  if (!wallet) {
    return 0
  }

  return parseFloat(wallet.balance as string)
}

/**
 * Get ledger history for a specific wallet
 * @param walletId - The wallet ID
 * @param limit - Maximum number of transactions to return
 * @param offset - Offset for pagination
 * @returns Array of wallet transactions
 */
export async function getLedgerHistory(
  walletId: string,
  limit: number = 50,
  offset: number = 0
): Promise<WalletTransaction[]> {
  const supabase = await createServiceRoleClient()

  const { data: transactions, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('wallet_id', walletId)
    .order('sequence_number', { ascending: false })
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
    sequenceNumber: parseInt(t.sequence_number as string, 10),
    idempotencyKey: t.idempotency_key || undefined,
    metadata: (t.metadata as Record<string, any>) || undefined,
    processedAt: t.processed_at || undefined,
  }))
}

