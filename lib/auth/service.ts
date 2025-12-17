import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validateSession, refreshSessionIfNeeded, invalidateSession } from './session'
import { validateSupabaseToken } from './token-validation'
import { hasRole, isSuperAdmin, isEventAdmin } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'

/**
 * Capa de abstracción para autenticación
 * Proporciona una interfaz consistente para todas las operaciones de auth
 */
export class AuthService {
  /**
   * Obtener usuario actual
   */
  static async getCurrentUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  }

  /**
   * Verificar autenticación
   */
  static async requireAuth() {
    const user = await this.getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    return user
  }

  /**
   * Verificar sesión y refrescar si es necesario
   */
  static async ensureValidSession() {
    const sessionInfo = await validateSession()
    if (!sessionInfo || !sessionInfo.isValid) {
      const refreshed = await refreshSessionIfNeeded()
      if (!refreshed) {
        throw new Error('Session expired or invalid')
      }
    }
    return await this.requireAuth()
  }

  /**
   * Verificar rol del usuario
   */
  static async requireRole(role: string, eventId?: string) {
    const user = await this.requireAuth()

    const hasRequiredRole = eventId
      ? await isEventAdmin(user.id, eventId) || await hasRole(user.id, role, eventId)
      : await hasRole(user.id, role) || await isSuperAdmin(user.id)

    if (!hasRequiredRole) {
      throw new Error(`Requires ${role} role`)
    }

    return user
  }

  /**
   * Verificar si es super admin
   */
  static async requireSuperAdmin() {
    const user = await this.requireAuth()

    if (!(await isSuperAdmin(user.id))) {
      throw new Error('Requires super admin role')
    }

    return user
  }

  /**
   * Verificar si es event admin
   */
  static async requireEventAdmin(eventId: string) {
    const user = await this.requireAuth()

    if (!(await isEventAdmin(user.id, eventId))) {
      throw new Error('Requires event admin role')
    }

    return user
  }

  /**
   * Validar token
   */
  static async validateToken(token: string) {
    return validateSupabaseToken(token)
  }

  /**
   * Cerrar sesión
   */
  static async signOut() {
    await invalidateSession()
  }

  /**
   * Sincronizar usuario con tabla users
   */
  static async syncUserToDatabase(userId: string, userData: {
    email?: string
    fullName?: string
    profilePhotoUrl?: string
  }) {
    const serviceClient = await createServiceRoleClient()
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      // Crear registro
      await (serviceClient.from('users') as any).insert({
        id: userId,
        email: userData.email || '',
        full_name: userData.fullName || null,
        profile_photo_url: userData.profilePhotoUrl || null,
      })
    } else {
      // Actualizar registro
      await (serviceClient.from('users') as any)
        .update({
          email: userData.email || '',
          full_name: userData.fullName || null,
          profile_photo_url: userData.profilePhotoUrl || null,
        })
        .eq('id', userId)
    }
  }

  /**
   * Verificar permisos específicos
   */
  static async hasPermission(
    userId: string,
    permission: string,
    resourceId?: string
  ): Promise<boolean> {
    // Por ahora, delegamos a los roles
    // En el futuro, esto puede ser más granular
    const user = await this.getCurrentUser()
    if (!user || user.id !== userId) {
      return false
    }

    // Verificar roles específicos según el permiso
    switch (permission) {
      case 'view_payments':
        return await hasRole(userId, ROLES.ACCOUNTING) || await isSuperAdmin(userId)
      case 'scan_tickets':
        return await hasRole(userId, ROLES.SCANNER) || await isSuperAdmin(userId)
      case 'manage_events':
        if (resourceId) {
          return await isEventAdmin(userId, resourceId) || await isSuperAdmin(userId)
        }
        return await hasRole(userId, ROLES.EVENT_ADMIN) || await isSuperAdmin(userId)
      default:
        return false
    }
  }
}

