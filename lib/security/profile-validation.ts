import { createServiceRoleClient } from '@/lib/supabase/server'

const MAX_PROFILE_UPDATES_PER_HOUR = 5
const SUSPICIOUS_CHANGE_THRESHOLD = 10 // Changes in last hour

/**
 * Check if user has exceeded rate limit for profile updates
 */
export async function checkProfileUpdateRateLimit(userId: string): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
}> {
  const supabase = await createServiceRoleClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Get recent profile updates from audit logs
  const { data: recentUpdates, error } = await supabase
    .from('audit_logs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('action', 'profile_updated')
    .gte('created_at', oneHourAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    // If error, allow the update (fail open)
    return {
      allowed: true,
      remaining: MAX_PROFILE_UPDATES_PER_HOUR,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
    }
  }

  const updateCount = recentUpdates?.length || 0
  const remaining = Math.max(0, MAX_PROFILE_UPDATES_PER_HOUR - updateCount)
  const resetAt = new Date(Date.now() + 60 * 60 * 1000)

  return {
    allowed: updateCount < MAX_PROFILE_UPDATES_PER_HOUR,
    remaining,
    resetAt,
  }
}

/**
 * Check for suspicious profile change patterns
 */
export async function checkSuspiciousProfileChanges(userId: string): Promise<{
  isSuspicious: boolean
  reasons: string[]
}> {
  const supabase = await createServiceRoleClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const reasons: string[] = []

  // Check for too many changes in short time
  const { data: recentChanges } = await supabase
    .from('audit_logs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('action', 'profile_updated')
    .gte('created_at', oneHourAgo.toISOString())

  const changeCount = recentChanges?.length || 0
  if (changeCount >= SUSPICIOUS_CHANGE_THRESHOLD) {
    reasons.push(`Demasiados cambios de perfil en la última hora (${changeCount})`)
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  }
}

/**
 * Validate phone number format (flexible)
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean
  error?: string
} {
  if (!phone || phone.trim() === '') {
    return { isValid: true } // Empty is allowed
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')

  // Check if it's a valid phone number
  // Accepts: +1234567890, 1234567890, (123) 456-7890, etc.
  const phoneRegex = /^\+?[1-9]\d{6,14}$/

  if (!phoneRegex.test(cleaned)) {
    return {
      isValid: false,
      error: 'Formato de teléfono inválido. Debe ser un número válido con código de país.',
    }
  }

  return { isValid: true }
}

/**
 * Validate profile photo URL (check if it's an image)
 */
export async function validateProfilePhotoUrl(url: string): Promise<{
  isValid: boolean
  error?: string
}> {
  if (!url || url.trim() === '') {
    return { isValid: true } // Empty is allowed
  }

  try {
    const urlObj = new URL(url)

    // Check if URL is valid
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: 'URL debe usar HTTP o HTTPS',
      }
    }

    // Check if URL points to an image (by extension)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    const pathname = urlObj.pathname.toLowerCase()
    const hasImageExtension = imageExtensions.some((ext) => pathname.endsWith(ext))

    if (!hasImageExtension && !pathname.includes('image') && !urlObj.searchParams.has('format')) {
      // Not a hard error, just a warning - allow it but log
      console.warn(`Profile photo URL may not be an image: ${url}`)
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: 'URL inválida',
    }
  }
}

