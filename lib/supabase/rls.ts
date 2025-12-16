import { createServiceRoleClient } from './server'
import { ROLES } from '@/lib/utils/constants'

/**
 * Helper to check if user has a specific role
 */
export async function hasRole(userId: string, role: string, eventId?: string): Promise<boolean> {
  const supabase = await createServiceRoleClient()
  
  let query = supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', role)
    .limit(1)

  if (eventId) {
    query = query.or(`event_id.eq.${eventId},event_id.is.null`)
  } else {
    query = query.is('event_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error checking role:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, ROLES.SUPER_ADMIN)
}

/**
 * Check if user is event admin for a specific event
 */
export async function isEventAdmin(userId: string, eventId: string): Promise<boolean> {
  return hasRole(userId, ROLES.EVENT_ADMIN, eventId) || isSuperAdmin(userId)
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string) {
  const supabase = await createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, event_id')
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return data || []
}

