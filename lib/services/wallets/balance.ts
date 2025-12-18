import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import {
  checkWalletTransactionIdempotency,
  generateWalletIdempotencyKey,
} from './idempotency'

/**
 * Get wallet balance for a user
 * @param userId - The user ID
 * @param eventId - Optional event ID for event-scoped wallets. If not provided, returns global wallet balance
 * @returns The wallet balance
 */
export async function getBalance(userId: string, eventId?: string): Promise<number> {
  const supabase = await createServiceRoleClient()

  let query = supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)

  if (eventId) {
    query = query.eq('event_id', eventId)
  } else {
    query = query.is('event_id', null)
  }

  const { data: walletData, error } = await (query.single() as any)

  const wallet = walletData as any

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  if (!wallet) {
    // Create wallet if it doesn't exist
    const { data: newWallet, error: createError } = await ((supabase as any)
      .from('wallets')
      .insert({
        user_id: userId,
        event_id: eventId || null,
        balance: '0',
      })
      .select()
      .single())

    if (createError || !newWallet) {
      throw new Error('Failed to create wallet')
    }

    return 0
  }

  return parseFloat(wallet.balance as string)
}

export async function addBalance(
  userId: string,
  amount: number,
  reference: {
    type: 'payment' | 'reload' | 'refund'
    id: string
    description: string
    eventId?: string
  },
  idempotencyKey?: string
): Promise<{ transactionId: string; newBalance: number }> {
  if (amount <= 0) {
    throw new ValidationError('Amount must be greater than 0')
  }

  const supabase = await createServiceRoleClient()

  // Generate idempotency key if not provided
  const finalIdempotencyKey = idempotencyKey || (await generateWalletIdempotencyKey())

  // Check idempotency - if transaction already exists, return it
  const existingTransactionId = await checkWalletTransactionIdempotency(finalIdempotencyKey)
  if (existingTransactionId) {
    const { data: existingTransactionData } = await (supabase
      .from('wallet_transactions')
      .select('balance_after')
      .eq('id', existingTransactionId)
      .single() as any)

    const existingTransaction = existingTransactionData as any

    if (existingTransaction) {
      return {
        transactionId: existingTransactionId,
        newBalance: parseFloat(existingTransaction.balance_after as string),
      }
    }
  }

  // Get or create wallet (event-scoped or global)
  const eventId = reference.eventId || null
  let query = supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)

  if (eventId) {
    query = query.eq('event_id', eventId)
  } else {
    query = query.is('event_id', null)
  }

  let { data: wallet } = await query.single()

  if (!wallet) {
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        event_id: eventId,
        balance: '0',
      })
      .select()
      .single()

    if (createError || !newWallet) {
      throw new Error('Failed to create wallet')
    }

    wallet = newWallet
  }

  const currentBalance = parseFloat(wallet.balance as string)
  const newBalance = currentBalance + amount

  // Get the next sequence number for this wallet
  const { data: lastTransaction } = await supabase
    .from('wallet_transactions')
    .select('sequence_number')
    .eq('wallet_id', wallet.id)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single()

  const nextSequenceNumber = lastTransaction
    ? parseInt(lastTransaction.sequence_number as string, 10) + 1
    : 1

  // Use a transaction to ensure atomicity
  // Note: Supabase doesn't support explicit transactions via client,
  // so we rely on database constraints and optimistic locking

  // Update wallet balance with optimistic locking
  const { error: updateError } = await supabase
    .from('wallets')
    .update({
      balance: newBalance.toFixed(2),
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .eq('balance', wallet.balance) // Optimistic locking

  if (updateError) {
    throw new Error('Failed to update wallet balance')
  }

  // Create transaction record with idempotency key
  const { data: transaction, error: transactionError } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      user_id: userId,
      transaction_type: 'credit',
      amount: amount.toFixed(2),
      balance_after: newBalance.toFixed(2),
      reference_type: reference.type,
      reference_id: reference.id,
      description: reference.description,
      event_id: eventId,
      idempotency_key: finalIdempotencyKey,
      sequence_number: nextSequenceNumber,
      metadata: {
        processedAt: new Date().toISOString(),
        referenceType: reference.type,
        referenceId: reference.id,
      },
      processed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (transactionError) {
    // If it's a duplicate key error, the transaction was already created
    if (transactionError.code === '23505') {
      // Unique constraint violation - transaction already exists
      const { data: existingTransaction } = await supabase
        .from('wallet_transactions')
        .select('id, balance_after')
        .eq('idempotency_key', finalIdempotencyKey)
        .single()

      if (existingTransaction) {
        return {
          transactionId: existingTransaction.id,
          newBalance: parseFloat(existingTransaction.balance_after as string),
        }
      }
    }
    throw new Error(`Failed to create transaction: ${transactionError.message}`)
  }

  if (!transaction) {
    throw new Error('Failed to create transaction')
  }

  // Update user's wallet_balance for quick access (only for global wallets)
  if (!eventId) {
    await supabase
      .from('users')
      .update({
        wallet_balance: newBalance.toFixed(2),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  return {
    transactionId: transaction.id,
    newBalance,
  }
}

export async function deductBalance(
  userId: string,
  amount: number,
  reference: {
    type: 'purchase' | 'transfer'
    id: string
    description: string
    eventId?: string
  },
  idempotencyKey?: string
): Promise<{ transactionId: string; newBalance: number }> {
  if (amount <= 0) {
    throw new ValidationError('Amount must be greater than 0')
  }

  const supabase = await createServiceRoleClient()

  // Generate idempotency key if not provided
  const finalIdempotencyKey = idempotencyKey || (await generateWalletIdempotencyKey())

  // Check idempotency - if transaction already exists, return it
  const existingTransactionId = await checkWalletTransactionIdempotency(finalIdempotencyKey)
  if (existingTransactionId) {
    const { data: existingTransaction } = await supabase
      .from('wallet_transactions')
      .select('balance_after')
      .eq('id', existingTransactionId)
      .single()

    if (existingTransaction) {
      return {
        transactionId: existingTransactionId,
        newBalance: parseFloat(existingTransaction.balance_after as string),
      }
    }
  }

  // Get wallet (event-scoped or global)
  const eventId = reference.eventId || null
  let query = supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)

  if (eventId) {
    query = query.eq('event_id', eventId)
  } else {
    query = query.is('event_id', null)
  }

  const { data: wallet, error: walletError } = await query.single()

  if (walletError || !wallet) {
    throw new NotFoundError('Wallet')
  }

  const currentBalance = parseFloat(wallet.balance as string)

  if (currentBalance < amount) {
    throw new ValidationError('Insufficient balance')
  }

  const newBalance = currentBalance - amount

  // Get the next sequence number for this wallet
  const { data: lastTransaction } = await supabase
    .from('wallet_transactions')
    .select('sequence_number')
    .eq('wallet_id', wallet.id)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .single()

  const nextSequenceNumber = lastTransaction
    ? parseInt(lastTransaction.sequence_number as string, 10) + 1
    : 1

  // Update wallet balance with optimistic locking
  const { error: updateError } = await supabase
    .from('wallets')
    .update({
      balance: newBalance.toFixed(2),
      updated_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .eq('balance', wallet.balance) // Optimistic locking

  if (updateError) {
    throw new Error('Failed to update wallet balance')
  }

  // Create transaction record with idempotency key
  const { data: transaction, error: transactionError } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      user_id: userId,
      transaction_type: 'debit',
      amount: amount.toFixed(2),
      balance_after: newBalance.toFixed(2),
      reference_type: reference.type,
      reference_id: reference.id,
      description: reference.description,
      event_id: eventId,
      idempotency_key: finalIdempotencyKey,
      sequence_number: nextSequenceNumber,
      metadata: {
        processedAt: new Date().toISOString(),
        referenceType: reference.type,
        referenceId: reference.id,
      },
      processed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (transactionError) {
    // If it's a duplicate key error, the transaction was already created
    if (transactionError.code === '23505') {
      // Unique constraint violation - transaction already exists
      const { data: existingTransaction } = await supabase
        .from('wallet_transactions')
        .select('id, balance_after')
        .eq('idempotency_key', finalIdempotencyKey)
        .single()

      if (existingTransaction) {
        return {
          transactionId: existingTransaction.id,
          newBalance: parseFloat(existingTransaction.balance_after as string),
        }
      }
    }
    throw new Error(`Failed to create transaction: ${transactionError.message}`)
  }

  if (!transaction) {
    throw new Error('Failed to create transaction')
  }

  // Update user's wallet_balance for quick access (only for global wallets)
  if (!eventId) {
    await supabase
      .from('users')
      .update({
        wallet_balance: newBalance.toFixed(2),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  return {
    transactionId: transaction.id,
    newBalance,
  }
}

