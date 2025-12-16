import { createClient } from '@/lib/supabase/server'
import { hasRole, isSuperAdmin, isEventAdmin } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'
import { AuthenticationError, AuthorizationError } from '@/lib/utils/errors'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthenticationError('Authentication required')
  }

  return user
}

export async function requireRole(role: string, eventId?: string) {
  const user = await requireAuth()
  
  const hasRequiredRole = eventId
    ? await isEventAdmin(user.id, eventId) || await hasRole(user.id, role, eventId)
    : await hasRole(user.id, role) || await isSuperAdmin(user.id)

  if (!hasRequiredRole) {
    throw new AuthorizationError(`Requires ${role} role`)
  }

  return user
}

export async function requireSuperAdmin() {
  const user = await requireAuth()
  
  if (!(await isSuperAdmin(user.id))) {
    throw new AuthorizationError('Requires super admin role')
  }

  return user
}

export async function requireEventAdmin(eventId: string) {
  const user = await requireAuth()
  
  if (!(await isEventAdmin(user.id, eventId))) {
    throw new AuthorizationError('Requires event admin role')
  }

  return user
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

