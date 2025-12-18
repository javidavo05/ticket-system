import { createServiceRoleClient } from './server'
import { ROLES } from '@/lib/utils/constants'

/**
 * Get user's organization ID
 */
export async function getUserOrganizationId(userId: string): Promise<string | null> {
  const supabase = await createServiceRoleClient()
  
  const { data: userData, error } = await ((supabase as any)
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .is('deleted_at', null)
    .single())

  const data = userData as any

  if (error || !data) {
    return null
  }

  return data.organization_id
}

/**
 * Check if user belongs to organization
 */
export async function userBelongsToOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const userOrgId = await getUserOrganizationId(userId)
  return userOrgId === organizationId
}

/**
 * Helper to check if user has a specific role
 */
export async function hasRole(
  userId: string,
  role: string,
  eventId?: string,
  organizationId?: string
): Promise<boolean> {
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

  // Filter by organization if provided
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
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
export async function isEventAdmin(
  userId: string,
  eventId: string,
  organizationId?: string
): Promise<boolean> {
  return (
    hasRole(userId, ROLES.EVENT_ADMIN, eventId, organizationId) ||
    isSuperAdmin(userId)
  )
}

/**
 * Verify user has access to organization resource
 */
export async function verifyOrganizationAccess(
  userId: string,
  resourceOrganizationId: string | null
): Promise<boolean> {
  if (!resourceOrganizationId) {
    // Allow access to resources without organization (backward compatibility)
    return true
  }

  const userOrgId = await getUserOrganizationId(userId)
  if (!userOrgId) {
    return false
  }

  return userOrgId === resourceOrganizationId || (await isSuperAdmin(userId))
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

