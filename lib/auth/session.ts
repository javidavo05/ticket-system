import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface SessionInfo {
  user: {
    id: string
    email?: string
  }
  expiresAt: number
  isValid: boolean
}

/**
 * Validar sesión activa y verificar si está expirada
 */
export async function validateSession(): Promise<SessionInfo | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return null
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now()
    const isValid = expiresAt > Date.now()

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      expiresAt,
      isValid,
    }
  } catch (error) {
    console.error('Error validating session:', error)
    return null
  }
}

/**
 * Refrescar token automáticamente si está cerca de expirar
 */
export async function refreshSessionIfNeeded(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return false
    }

    // Si el token expira en menos de 5 minutos, refrescarlo
    const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now()
    const timeUntilExpiry = expiresAt - Date.now()
    const fiveMinutes = 5 * 60 * 1000

    if (timeUntilExpiry < fiveMinutes) {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('Error refreshing session:', error)
        return false
      }

      return !!data.session
    }

    return true
  } catch (error) {
    console.error('Error in refreshSessionIfNeeded:', error)
    return false
  }
}

/**
 * Obtener información de la sesión actual
 */
export async function getSessionInfo(): Promise<SessionInfo | null> {
  return validateSession()
}

/**
 * Verificar si la sesión está expirada
 */
export async function isSessionExpired(): Promise<boolean> {
  const sessionInfo = await validateSession()
  return !sessionInfo || !sessionInfo.isValid
}

/**
 * Invalidar sesión (logout)
 */
export async function invalidateSession(): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error invalidating session:', error)
  }
}

/**
 * Obtener tiempo restante hasta la expiración en segundos
 */
export async function getTimeUntilExpiry(): Promise<number | null> {
  const sessionInfo = await validateSession()
  if (!sessionInfo || !sessionInfo.isValid) {
    return null
  }

  const timeUntilExpiry = (sessionInfo.expiresAt - Date.now()) / 1000
  return Math.max(0, Math.floor(timeUntilExpiry))
}

