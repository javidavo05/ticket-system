import { createServiceRoleClient } from '@/lib/supabase/server'
import { ValidationError } from '@/lib/utils/errors'

// Cloning detection thresholds
const DISTANCE_THRESHOLD_METERS = 100 // 100 meters
const TIME_THRESHOLD_SECONDS = 5 // 5 seconds

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Parse POINT from PostgreSQL format
 * @param point - POINT string in format "(lon,lat)"
 * @returns { lat, lng } or null
 */
function parsePoint(point: string | null): { lat: number; lng: number } | null {
  if (!point) return null
  const match = point.match(/\(([^,]+),([^)]+)\)/)
  if (!match) return null
  return {
    lng: parseFloat(match[1]),
    lat: parseFloat(match[2]),
  }
}

/**
 * Check for concurrent use in different locations
 * @param bandId - The NFC band ID
 * @param location - Current location { lat, lng }
 * @returns Result with cloning detection info
 */
export async function checkConcurrentUse(
  bandId: string,
  location: { lat: number; lng: number }
): Promise<{
  hasConcurrentUse: boolean
  distance?: number
  timeDifference?: number
  otherLocation?: { lat: number; lng: number }
}> {
  const supabase = await createServiceRoleClient()

  // Get active usage sessions
  const { data: activeSessions, error } = await (supabase
    .from('nfc_usage_sessions')
    .select('id, location, started_at')
    .eq('nfc_band_id', bandId)
    .is('ended_at', null)
    .order('started_at', { ascending: false }) as any)

  if (error || !activeSessions || activeSessions.length === 0) {
    return { hasConcurrentUse: false }
  }

  const sessionsData = (activeSessions || []) as any[]
  const now = new Date()

  // Check each active session
  for (const session of sessionsData) {
    const sessionLocation = parsePoint(session.location as string | null)
    if (!sessionLocation) continue

    const timeDifference = (now.getTime() - new Date(session.started_at).getTime()) / 1000

    // Calculate distance
    const distance = calculateDistance(
      location.lat,
      location.lng,
      sessionLocation.lat,
      sessionLocation.lng
    )

    // If distance > threshold and time < threshold, possible cloning
    if (distance > DISTANCE_THRESHOLD_METERS && timeDifference < TIME_THRESHOLD_SECONDS) {
      return {
        hasConcurrentUse: true,
        distance,
        timeDifference,
        otherLocation: sessionLocation,
      }
    }
  }

  return { hasConcurrentUse: false }
}

/**
 * Detect cloning based on usage patterns
 * @param bandId - The NFC band ID
 * @param currentLocation - Current location { lat, lng }
 * @returns Cloning detection result
 */
export async function detectCloning(
  bandId: string,
  currentLocation?: { lat?: number; lng?: number }
): Promise<{
  isCloned: boolean
  confidence: 'low' | 'medium' | 'high' | 'none'
  reason?: string
  alerts?: string[]
}> {
  const supabase = await createServiceRoleClient()

  // If no valid location, skip location-based checks
  if (!currentLocation || typeof currentLocation.lat !== 'number' || typeof currentLocation.lng !== 'number') {
    return {
      isCloned: false,
      confidence: 'none',
      reason: 'No location provided for cloning detection',
    }
  }

  // Check concurrent use
  const concurrentCheck = await checkConcurrentUse(bandId, currentLocation as { lat: number; lng: number })
  if (concurrentCheck.hasConcurrentUse) {
    return {
      isCloned: true,
      confidence: 'high',
      reason: `Concurrent use detected: ${concurrentCheck.distance?.toFixed(0)}m apart in ${concurrentCheck.timeDifference?.toFixed(1)}s`,
      alerts: ['Concurrent use in distant locations detected'],
    }
  }

  // Check band's concurrent use count
  const { data: band } = await (supabase
    .from('nfc_bands')
    .select('concurrent_use_count, max_concurrent_uses')
    .eq('id', bandId)
    .single() as any)

  const bandData = band as any
  if (bandData && bandData.concurrent_use_count > bandData.max_concurrent_uses) {
    return {
      isCloned: true,
      confidence: 'medium',
      reason: `Concurrent use count (${bandData.concurrent_use_count}) exceeds maximum (${bandData.max_concurrent_uses})`,
      alerts: ['Concurrent use limit exceeded'],
    }
  }

  // Check for rapid location changes
  const { data: recentSessions } = await (supabase
    .from('nfc_usage_sessions')
    .select('location, started_at, ended_at')
    .eq('nfc_band_id', bandId)
    .order('started_at', { ascending: false })
    .limit(5) as any)

  const sessionsData = (recentSessions || []) as any[]
  if (sessionsData.length > 1) {
    const alerts: string[] = []
    for (let i = 0; i < sessionsData.length - 1; i++) {
      const current = parsePoint(sessionsData[i].location as string | null)
      const previous = parsePoint(sessionsData[i + 1].location as string | null)

      if (current && previous) {
        const distance = calculateDistance(
          current.lat,
          current.lng,
          previous.lat,
          previous.lng
        )

        const timeDiff =
          (new Date(sessionsData[i].started_at).getTime() -
            new Date(sessionsData[i + 1].started_at).getTime()) /
          1000

        // If moved > 100m in < 10 seconds, suspicious
        if (distance > DISTANCE_THRESHOLD_METERS && timeDiff < 10) {
          alerts.push(`Rapid location change: ${distance.toFixed(0)}m in ${timeDiff.toFixed(1)}s`)
        }
      }
    }

    if (alerts.length > 0) {
      return {
        isCloned: true,
        confidence: 'medium',
        reason: 'Rapid location changes detected',
        alerts,
      }
    }
  }

  return {
    isCloned: false,
    confidence: 'low',
  }
}

/**
 * Handle cloning alert - mark band and notify admins
 * @param bandId - The NFC band ID
 * @param reason - Reason for cloning alert
 */
export async function handleCloningAlert(bandId: string, reason: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Update band status to deactivated temporarily
  const { data: existingBand } = await (supabase
    .from('nfc_bands')
    .select('metadata')
    .eq('id', bandId)
    .single() as any)

  const existingMetadata = (existingBand as any)?.metadata as Record<string, any> || {}

  await ((supabase
    .from('nfc_bands') as any)
    .update({
      status: 'deactivated',
      metadata: {
        ...existingMetadata,
        cloningAlert: {
          reason,
          detectedAt: new Date().toISOString(),
        },
      },
    })
    .eq('id', bandId))

  // Log audit event (would need audit service)
  // await logAuditEvent({
  //   action: 'nfc_cloning_detected',
  //   resourceType: 'nfc_band',
  //   resourceId: bandId,
  //   metadata: { reason },
  // })

  // In production, send notification to admins
  // await notifyAdmins({
  //   type: 'nfc_cloning',
  //   bandId,
  //   reason,
  // })
}

/**
 * Start a new usage session
 * @param bandId - The NFC band ID
 * @param location - Current location { lat, lng }
 * @returns Session token
 */
export async function startUsageSession(
  bandId: string,
  eventId: string,
  location?: { lat?: number; lng?: number }
): Promise<string> {
  const supabase = await createServiceRoleClient()

  const sessionToken = crypto.randomUUID()
  const point = location && location.lng && location.lat ? `(${location.lng},${location.lat})` : null

  const { data: session, error } = await ((supabase
    .from('nfc_usage_sessions') as any)
    .insert({
      nfc_band_id: bandId,
      session_token: sessionToken,
      location: point,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single())

  if (error || !session) {
    throw new Error(`Failed to start usage session: ${error?.message}`)
  }

  // Update band's last location and concurrent use count
  const { data: band } = await (supabase
    .from('nfc_bands')
    .select('concurrent_use_count')
    .eq('id', bandId)
    .single() as any)

  const bandData = band as any
  const newCount = (bandData?.concurrent_use_count || 0) + 1

  await ((supabase
    .from('nfc_bands') as any)
    .update({
      last_location: point,
      concurrent_use_count: newCount,
    })
    .eq('id', bandId))

  return sessionToken
}

/**
 * End a usage session
 * @param sessionToken - Session token
 */
export async function endUsageSession(sessionToken: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get session to get band ID
  const { data: session } = await (supabase
    .from('nfc_usage_sessions')
    .select('nfc_band_id, transaction_count')
    .eq('session_token', sessionToken)
    .is('ended_at', null)
    .single() as any)

  if (!session) {
    return // Session already ended or doesn't exist
  }

  const sessionData = session as any
  // End session
  await ((supabase
    .from('nfc_usage_sessions') as any)
    .update({
      ended_at: new Date().toISOString(),
    })
    .eq('session_token', sessionToken))

  // Decrease concurrent use count
  const { data: band } = await (supabase
    .from('nfc_bands')
    .select('concurrent_use_count')
    .eq('id', sessionData.nfc_band_id)
    .single() as any)

  const bandData = band as any
  if (bandData && bandData.concurrent_use_count > 0) {
    await ((supabase
      .from('nfc_bands') as any)
      .update({
        concurrent_use_count: bandData.concurrent_use_count - 1,
      })
      .eq('id', sessionData.nfc_band_id))
  }
}
