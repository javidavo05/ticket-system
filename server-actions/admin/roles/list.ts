'use server'

import { requireRole, requireSuperAdmin, getCurrentUser } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { AuthorizationError, NotFoundError } from '@/lib/utils/errors'
import { canManageEvent } from '@/lib/auth/permissions'

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    throw new AuthorizationError('Authentication required')
  }

  // Only super admin or the user themselves can view roles
  if (currentUser.id !== userId) {
    await requireSuperAdmin()
  }

  const supabase = await createServiceRoleClient()

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select(`
      *,
      events (
        id,
        name,
        slug
      ),
      organizations (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Error al obtener roles: ${error.message}`)
  }

  const rolesList = (roles || []) as Array<{
    [key: string]: any
    events?: any
    organizations?: any
  }>

  return rolesList.map((role) => ({
    ...role,
    event: Array.isArray(role.events) ? role.events[0] : role.events,
    organization: Array.isArray(role.organizations) ? role.organizations[0] : role.organizations,
  }))
}

/**
 * Get all admins for an event
 */
export async function getEventAdmins(eventId: string) {
  await requireRole(ROLES.EVENT_ADMIN)

  const supabase = await createServiceRoleClient()

  // Verify event exists
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .is('deleted_at', null)
    .single()

  if (!event) {
    throw new NotFoundError('Event')
  }

  // Get event admins
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select(`
      *,
      users!user_roles_user_id_fkey (
        id,
        email,
        full_name
      )
    `)
    .eq('role', ROLES.EVENT_ADMIN)
    .or(`event_id.eq.${eventId},event_id.is.null`)

  if (error) {
    throw new Error(`Error al obtener admins: ${error.message}`)
  }

  const rolesList = (roles || []) as Array<{
    [key: string]: any
    users?: any
  }>

  return rolesList.map((role) => ({
    ...role,
    user: Array.isArray(role.users) ? role.users[0] : role.users,
  }))
}

/**
 * Get all users in an organization
 */
export async function getOrganizationUsers(organizationId: string) {
  await requireSuperAdmin()

  const supabase = await createServiceRoleClient()

  // Verify organization exists
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .single()

  if (!org) {
    throw new NotFoundError('Organization')
  }

  // Get users with their roles
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      *,
      user_roles (
        id,
        role,
        event_id,
        created_at
      )
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Error al obtener usuarios: ${error.message}`)
  }

  const usersList = (users || []) as Array<{
    [key: string]: any
    user_roles?: any
  }>

  return usersList.map((user) => ({
    ...user,
    roles: Array.isArray(user.user_roles) ? user.user_roles : [],
  }))
}

