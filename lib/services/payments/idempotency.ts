import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateIdempotencyKey } from '@/lib/security/crypto'

export async function checkIdempotency(key: string): Promise<string | null> {
  const supabase = await createServiceRoleClient()

  const { data, error } = await supabase
    .from('payments')
    .select('id')
    .eq('idempotency_key', key)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" - that's fine
    throw error
  }

  return data?.id || null
}

export async function createIdempotencyKey(): Promise<string> {
  let key: string
  let exists: string | null
  let attempts = 0
  const maxAttempts = 10

  do {
    key = generateIdempotencyKey()
    exists = await checkIdempotency(key)
    attempts++
  } while (exists && attempts < maxAttempts)

  if (exists) {
    throw new Error('Failed to generate unique idempotency key')
  }

  return key
}

