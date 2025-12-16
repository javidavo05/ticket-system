import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError, ValidationError } from '@/lib/utils/errors'

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
  const { data: existing } = await supabase
    .from('nfc_bands')
    .select('id, user_id')
    .eq('band_uid', bandUid)
    .single()

  if (existing) {
    if (existing.user_id !== userId) {
      throw new ValidationError('NFC band is already registered to another user')
    }
    return existing.id
  }

  // Register band
  const { data: band, error } = await supabase
    .from('nfc_bands')
    .insert({
      band_uid: bandUid,
      user_id: userId,
      event_id: eventId || null,
      registered_by: registeredBy,
      status: 'active',
    })
    .select()
    .single()

  if (error || !band) {
    throw new Error(`Failed to register NFC band: ${error?.message}`)
  }

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
  zoneId?: string
): Promise<{ valid: boolean; userId?: string; reason?: string }> {
  const supabase = await createServiceRoleClient()

  const { data: band, error } = await supabase
    .from('nfc_bands')
    .select('user_id, status, event_id')
    .eq('band_uid', bandUid)
    .single()

  if (error || !band) {
    return {
      valid: false,
      reason: 'NFC band not found',
    }
  }

  if (band.status !== 'active') {
    return {
      valid: false,
      userId: band.user_id,
      reason: `NFC band is ${band.status}`,
    }
  }

  // Check event access
  if (band.event_id && band.event_id !== eventId) {
    return {
      valid: false,
      userId: band.user_id,
      reason: 'NFC band not valid for this event',
    }
  }

  // Update last used timestamp
  await supabase
    .from('nfc_bands')
    .update({
      last_used_at: new Date().toISOString(),
    })
    .eq('id', band.id)

  return {
    valid: true,
    userId: band.user_id,
  }
}

export async function processNFCPayment(
  bandUid: string,
  amount: number,
  eventId: string
): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get band
  const { data: band, error: bandError } = await supabase
    .from('nfc_bands')
    .select('user_id, status')
    .eq('band_uid', bandUid)
    .single()

  if (bandError || !band) {
    throw new NotFoundError('NFC band')
  }

  if (band.status !== 'active') {
    throw new ValidationError(`NFC band is ${band.status}`)
  }

  // Deduct from wallet
  const { deductBalance } = await import('./balance')
  await deductBalance(band.user_id, amount, {
    type: 'purchase',
    id: crypto.randomUUID(),
    description: `NFC payment for event ${eventId}`,
    eventId,
  })

  // Record NFC transaction
  await supabase.from('nfc_transactions').insert({
    nfc_band_id: band.id,
    user_id: band.user_id,
    event_id: eventId,
    transaction_type: 'payment',
    amount: amount.toFixed(2),
  })
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

