import { createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperAdmin, hasRole } from '@/lib/supabase/rls'
import { ROLES } from '@/lib/utils/constants'
import { ROLE_HIERARCHY } from '@/lib/auth/roles'
import { ValidationError, AuthorizationError } from '@/lib/utils/errors'

/**
 * Validate role hierarchy - can only assign roles at or below your level
 */
export function validateRoleHierarchy(
  assignerRole: string,
  targetRole: string
): { valid: boolean; error?: string } {
  const assignerLevel = ROLE_HIERARCHY[assignerRole] || 0
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0

  // Super admin can assign any role
  if (assignerRole === ROLES.SUPER_ADMIN) {
    return { valid: true }
  }

  // Cannot assign roles above your level
  if (targetLevel > assignerLevel) {
    return {
      valid: false,
      error: `No puedes asignar el rol ${targetRole} (nivel ${targetLevel}), tu nivel es ${assignerLevel}`,
    }
  }

  return { valid: true }
}

/**
 * Check if user can assign a role
 */
export async function canAssignRole(
  assignerId: string,
  targetRole: string,
  eventId?: string
): Promise<{ canAssign: boolean; error?: string }> {
  // Super admin can always assign
  if (await isSuperAdmin(assignerId)) {
    return { canAssign: true }
  }

  // Get assigner's role
  const assignerIsEventAdmin = eventId
    ? await hasRole(assignerId, ROLES.EVENT_ADMIN, eventId)
    : await hasRole(assignerId, ROLES.EVENT_ADMIN)

  if (!assignerIsEventAdmin) {
    return {
      canAssign: false,
      error: 'Solo event_admin o super_admin pueden asignar roles',
    }
  }

  // Validate hierarchy
  const assignerRole = assignerIsEventAdmin ? ROLES.EVENT_ADMIN : ROLES.USER
  const hierarchyCheck = validateRoleHierarchy(assignerRole, targetRole)
  if (!hierarchyCheck.valid) {
    return {
      canAssign: false,
      error: hierarchyCheck.error,
    }
  }

  return { canAssign: true }
}

/**
 * Validate that removing this role won't leave system without super admin
 */
export async function validateLastSuperAdmin(userId: string): Promise<{
  canRemove: boolean
  error?: string
}> {
  const supabase = await createServiceRoleClient()

  // Check if user is super admin
  const isUserSuperAdmin = await isSuperAdmin(userId)
  if (!isUserSuperAdmin) {
    return { canRemove: true } // Not a super admin, can remove
  }

  // Count total super admins
  const { data: superAdmins, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', ROLES.SUPER_ADMIN)
    .is('event_id', null)

  if (error) {
    return {
      canRemove: false,
      error: 'Error al verificar super admins',
    }
  }

  // Get unique super admin user IDs
  const uniqueSuperAdmins = new Set(superAdmins?.map((r) => r.user_id) || [])

  // If this is the only super admin, cannot remove
  if (uniqueSuperAdmins.size === 1 && uniqueSuperAdmins.has(userId)) {
    return {
      canRemove: false,
      error: 'No se puede eliminar el último super_admin del sistema',
    }
  }

  return { canRemove: true }
}

/**
 * Validate role doesn't already exist
 */
export async function validateRoleUniqueness(
  userId: string,
  role: string,
  eventId?: string,
  organizationId?: string
): Promise<{ exists: boolean; error?: string }> {
  const supabase = await createServiceRoleClient()

  let query = supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', role)

  if (eventId) {
    query = query.or(`event_id.eq.${eventId},event_id.is.null`)
  } else {
    query = query.is('event_id', null)
  }

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    return {
      exists: false,
      error: 'Error al verificar rol existente',
    }
  }

  if (data && data.length > 0) {
    return {
      exists: true,
      error: 'El usuario ya tiene este rol asignado',
    }
  }

  return { exists: false }
}

