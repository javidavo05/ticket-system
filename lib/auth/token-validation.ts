import { createClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null

/**
 * Validar token JWT de Supabase
 */
export async function validateSupabaseToken(token: string): Promise<{
  valid: boolean
  payload?: any
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        valid: false,
        error: error?.message || 'Invalid token',
      }
    }

    return {
      valid: true,
      payload: {
        userId: user.id,
        email: user.email,
      },
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Token validation failed',
    }
  }
}

/**
 * Validar token JWT personalizado (para QR codes, etc.)
 */
export async function validateCustomJWT(token: string): Promise<{
  valid: boolean
  payload?: any
  error?: string
}> {
  if (!JWT_SECRET) {
    return {
      valid: false,
      error: 'JWT_SECRET not configured',
    }
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      valid: true,
      payload,
    }
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid JWT token',
    }
  }
}

/**
 * Validar token en cada request crítico
 */
export async function validateRequestToken(
  token: string | null,
  type: 'supabase' | 'custom' = 'supabase'
): Promise<{
  valid: boolean
  payload?: any
  error?: string
}> {
  if (!token) {
    return {
      valid: false,
      error: 'No token provided',
    }
  }

  if (type === 'supabase') {
    return validateSupabaseToken(token)
  } else {
    return validateCustomJWT(token)
  }
}

/**
 * Invalidar token (logout, cambio de contraseña)
 */
export async function invalidateToken(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

/**
 * Verificar si un token está expirado
 */
export function isTokenExpired(expiresAt: number): boolean {
  return expiresAt < Date.now() / 1000
}

