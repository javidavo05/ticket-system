import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateIdempotencyKey } from '@/lib/security/crypto'

/**
 * Check if a wallet transaction with the given idempotency key already exists
 * @param key - The idempotency key to check
 * @returns The transaction ID if it exists, null otherwise
 */
export async function checkWalletTransactionIdempotency(key: string): Promise<string | null> {
  const supabase = await createServiceRoleClient()

  const { data, error } = await (supabase
    .from('wallet_transactions')
    .select('id')
    .eq('idempotency_key', key)
    .single() as any)

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" - that's fine
    throw error
  }

  return (data as any)?.id || null
}

/**
 * Generate a unique idempotency key for wallet transactions
 * @returns A unique idempotency key
 */
export async function generateWalletIdempotencyKey(): Promise<string> {
  let key: string
  let exists: string | null
  let attempts = 0
  const maxAttempts = 10

  do {
    key = generateIdempotencyKey()
    exists = await checkWalletTransactionIdempotency(key)
    attempts++
  } while (exists && attempts < maxAttempts)

  if (exists) {
    throw new Error('Failed to generate unique idempotency key')
  }

  return key
}

/**
 * Validate ledger integrity for a wallet
 * Checks that the balance matches the calculated balance from transactions
 * @param walletId - The wallet ID to validate
 * @returns Validation result with details
 */
export async function validateLedgerIntegrity(walletId: string): Promise<{
  isValid: boolean
  errorMessage?: string
  expectedBalance: number
  actualBalance: number
  transactionCount: number
}> {
  const supabase = await createServiceRoleClient()

  // Call the database function to validate integrity
  const { data, error } = await (supabase as any).rpc('validate_wallet_ledger_integrity', {
    wallet_uuid: walletId,
  })

  if (error) {
    throw new Error(`Failed to validate ledger integrity: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('No validation result returned')
  }

  const result = data[0]

  return {
    isValid: result.is_valid,
    errorMessage: result.error_message || undefined,
    expectedBalance: parseFloat(result.expected_balance as string),
    actualBalance: parseFloat(result.actual_balance as string),
    transactionCount: parseInt(result.transaction_count as string, 10),
  }
}

/**
 * Check for sequence number gaps in wallet transactions
 * @param walletId - The wallet ID to check
 * @returns Gap check result
 */
export async function checkWalletSequenceGaps(walletId: string): Promise<{
  hasGaps: boolean
  gapCount: number
  minSequence: number
  maxSequence: number
  expectedCount: number
  actualCount: number
}> {
  const supabase = await createServiceRoleClient()

  const { data, error } = await (supabase as any).rpc('check_wallet_sequence_gaps', {
    wallet_uuid: walletId,
  })

  if (error) {
    throw new Error(`Failed to check sequence gaps: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('No gap check result returned')
  }

  const result = data[0]

  return {
    hasGaps: result.has_gaps,
    gapCount: parseInt(result.gap_count as string, 10),
    minSequence: parseInt(result.min_sequence as string, 10),
    maxSequence: parseInt(result.max_sequence as string, 10),
    expectedCount: parseInt(result.expected_count as string, 10),
    actualCount: parseInt(result.actual_count as string, 10),
  }
}
