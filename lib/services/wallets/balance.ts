import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'

export async function getBalance(userId: string): Promise<number> {
  const supabase = await createServiceRoleClient()

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  if (!wallet) {
    // Create wallet if it doesn't exist
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        balance: '0',
      })
      .select()
      .single()

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
  }
): Promise<void> {
  if (amount <= 0) {
    throw new ValidationError('Amount must be greater than 0')
  }

  const supabase = await createServiceRoleClient()

  // Get or create wallet
  let { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .single()

  if (!wallet) {
    const { data: newWallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
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

  // Update wallet balance
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

  // Create transaction record
  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    user_id: userId,
    transaction_type: 'credit',
    amount: amount.toFixed(2),
    balance_after: newBalance.toFixed(2),
    reference_type: reference.type,
    reference_id: reference.id,
    description: reference.description,
    event_id: reference.eventId || null,
  })

  // Update user's wallet_balance for quick access
  await supabase
    .from('users')
    .update({
      wallet_balance: newBalance.toFixed(2),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

export async function deductBalance(
  userId: string,
  amount: number,
  reference: {
    type: 'purchase' | 'transfer'
    id: string
    description: string
    eventId?: string
  }
): Promise<void> {
  if (amount <= 0) {
    throw new ValidationError('Amount must be greater than 0')
  }

  const supabase = await createServiceRoleClient()

  // Get wallet
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .single()

  if (walletError || !wallet) {
    throw new NotFoundError('Wallet')
  }

  const currentBalance = parseFloat(wallet.balance as string)

  if (currentBalance < amount) {
    throw new ValidationError('Insufficient balance')
  }

  const newBalance = currentBalance - amount

  // Update wallet balance
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

  // Create transaction record
  await supabase.from('wallet_transactions').insert({
    wallet_id: wallet.id,
    user_id: userId,
    transaction_type: 'debit',
    amount: amount.toFixed(2),
    balance_after: newBalance.toFixed(2),
    reference_type: reference.type,
    reference_id: reference.id,
    description: reference.description,
    event_id: reference.eventId || null,
  })

  // Update user's wallet_balance
  await supabase
    .from('users')
    .update({
      wallet_balance: newBalance.toFixed(2),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

