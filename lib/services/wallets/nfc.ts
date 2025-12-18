import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'
import { generateSecurityToken } from '../nfc/tokens'
import { validateNFCRequest } from '../nfc/validation'
import { endUsageSession } from '../nfc/anti-cloning'

export interface NFCBand {
  id: string
  bandUid: string
  userId: string
  eventId?: string
  status: 'active' | 'lost' | 'deactivated'
  registeredAt: string
  lastUsedAt?: string
}

export async function registerBand(
  bandUid: string,
  userId: string,
  eventId: string | undefined,
  registeredBy: string
): Promise<string> {
  const supabase = await createServiceRoleClient()

  // Check if band is already registered
  const { data: existingData } = await (supabase
    .from('nfc_bands')
    .select('id, user_id')
    .eq('band_uid', bandUid)
    .single() as any)

  const existing = existingData as any

  if (existing) {
    if (existing.user_id !== userId) {
      throw new ValidationError('NFC band is already registered to another user')
    }
    return existing.id
  }

  // Register band
  const { data: bandData, error } = await ((supabase as any)
    .from('nfc_bands')
    .insert({
      band_uid: bandUid,
      user_id: userId,
      event_id: eventId || null,
      registered_by: registeredBy,
      status: 'active',
    })
    .select()
    .single())

  const band = bandData as any

  if (error || !band) {
    throw new Error(`Failed to register NFC band: ${error?.message}`)
  }

  // Generate security token
  try {
    await generateSecurityToken(band.id)
  } catch (tokenError) {
    // Non-critical, log but continue
    console.error('Failed to generate security token:', tokenError)
  }

  // Initialize rate limit
  await ((supabase as any).from('nfc_rate_limits').insert({
    nfc_band_id: band.id,
    window_start: new Date().toISOString(),
    request_count: 0,
    max_requests: 10,
    window_duration_seconds: 60,
  })

  return band.id
}

export async function bindBandToUser(bandUid: string, userId: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  const { error } = await supabase
    .from('nfc_bands')
    .update({
      user_id: userId,
      last_used_at: new Date().toISOString(),
    })
    .eq('band_uid', bandUid)

  if (error) {
    throw new Error(`Failed to bind NFC band: ${error.message}`)
  }
}

export async function validateBandAccess(
  bandUid: string,
  eventId: string,
  zoneId?: string,
  location?: { lat: number; lng: number }
): Promise<{ valid: boolean; userId?: string; reason?: string; alerts?: string[] }> {
  const supabase = await createServiceRoleClient()

  const { data: band, error } = await supabase
    .from('nfc_bands')
    .select('id, user_id, status, event_id')
    .eq('band_uid', bandUid)
    .single()

  if (error || !band) {
    return {
      valid: false,
      reason: 'NFC band not found',
    }
  }

  // Use new validation service if available
  const { validateBandAccess: validateAccess } = await import('../nfc/validation')
  return validateAccess(band.id, eventId, zoneId, location)
}

export async function processNFCPayment(
  bandUid: string,
  amount: number,
  eventId: string,
  token?: string,
  nonce?: string,
  location?: { lat?: number; lng?: number }
): Promise<{ transactionId: string; newBalance: number }> {
  const supabase = await createServiceRoleClient()

  // Get band
  const { data: band, error: bandError } = await supabase
    .from('nfc_bands')
    .select('id, user_id, status')
    .eq('band_uid', bandUid)
    .single()

  if (bandError || !band) {
    throw new NotFoundError('NFC band')
  }

  if (band.status !== 'active') {
    throw new ValidationError(`NFC band is ${band.status}`)
  }

  // If token and nonce provided, validate them
  if (token && nonce) {
    const validation = await validateNFCRequest(token, nonce, eventId, undefined, location)
    if (!validation.valid) {
      throw new ValidationError(validation.reason || 'NFC validation failed')
    }
  }

  // Generate nonce if not provided
  const finalNonce = nonce || crypto.randomUUID()

  // Deduct from wallet with idempotency
  const { deductBalance } = await import('./balance')
  const result = await deductBalance(
    band.user_id,
    amount,
    {
      type: 'purchase',
      id: crypto.randomUUID(),
      description: `NFC payment for event ${eventId}`,
      eventId,
    },
    `nfc_payment_${band.id}_${finalNonce}`
  )

  // Record NFC transaction
  const { data: transaction, error: txError } = await supabase
    .from('nfc_transactions')
    .insert({
      nfc_band_id: band.id,
      user_id: band.user_id,
      event_id: eventId,
      transaction_type: 'payment',
      amount: amount.toFixed(2),
    })
    .select('id')
    .single()

  if (txError || !transaction) {
    throw new Error(`Failed to record NFC transaction: ${txError?.message}`)
  }

  // Link nonce to transaction if nonce was used
  if (nonce) {
    await supabase
      .from('nfc_nonces')
      .update({
        transaction_id: transaction.id,
      })
      .eq('nfc_band_id', band.id)
      .eq('nonce', nonce)
  }

  return {
    transactionId: transaction.id,
    newBalance: result.newBalance,
  }
}

export async function getBandsByUser(userId: string): Promise<NFCBand[]> {
  const supabase = await createServiceRoleClient()

  const { data: bands, error } = await supabase
    .from('nfc_bands')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (bands || []).map(b => ({
    id: b.id,
    bandUid: b.band_uid,
    userId: b.user_id,
    eventId: b.event_id || undefined,
    status: b.status as 'active' | 'lost' | 'deactivated',
    registeredAt: b.registered_at,
    lastUsedAt: b.last_used_at || undefined,
  }))
}

