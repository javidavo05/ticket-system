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

export async function requireRole(role: string | string[], eventId?: string) {
  const user = await requireAuth()
  
  const roles = Array.isArray(role) ? role : [role]
  
  const hasRequiredRole = eventId
    ? await isEventAdmin(user.id, eventId) || (await Promise.all(roles.map(r => hasRole(user.id, r, eventId)))).some(Boolean)
    : (await Promise.all(roles.map(r => hasRole(user.id, r)))).some(Boolean) || await isSuperAdmin(user.id)

  if (!hasRequiredRole) {
    const roleStr = Array.isArray(role) ? role.join(' or ') : role
    throw new AuthorizationError(`Requires ${roleStr} role`)
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
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('❌ [getCurrentUser] Error al obtener usuario:', error.message)
      return null
    }
    
    return user
  } catch (err: any) {
    console.error('❌ [getCurrentUser] Excepción:', err.message)
    return null
  }
}

/**
 * Require accounting role - can view all financial data
 */
export async function requireAccounting() {
  const user = await requireAuth()
  
  const hasAccountingRole = await hasRole(user.id, ROLES.ACCOUNTING) || await isSuperAdmin(user.id)
  
  if (!hasAccountingRole) {
    throw new AuthorizationError('Requires accounting role')
  }
  
  return user
}

/**
 * Require scanner role - can scan tickets for assigned events
 */
export async function requireScanner(eventId?: string) {
  const user = await requireAuth()
  
  let hasScannerRole = false
  if (eventId) {
    hasScannerRole = await hasRole(user.id, ROLES.SCANNER, eventId) || await isSuperAdmin(user.id)
  } else {
    hasScannerRole = await hasRole(user.id, ROLES.SCANNER) || await isSuperAdmin(user.id)
  }
  
  if (!hasScannerRole) {
    throw new AuthorizationError('Requires scanner role')
  }
  
  return user
}

/**
 * Require promoter role - can view tickets and payments for their events
 */
export async function requirePromoter(eventId?: string) {
  const user = await requireAuth()
  
  let hasPromoterRole = false
  if (eventId) {
    hasPromoterRole = await hasRole(user.id, ROLES.PROMOTER, eventId) || await isSuperAdmin(user.id)
  } else {
    hasPromoterRole = await hasRole(user.id, ROLES.PROMOTER) || await isSuperAdmin(user.id)
  }
  
  if (!hasPromoterRole) {
    throw new AuthorizationError('Requires promoter role')
  }
  
  return user
}

/**
 * Check if user can view financial data (accounting or super admin)
 */
export async function canViewFinancialData(userId: string): Promise<boolean> {
  return await hasRole(userId, ROLES.ACCOUNTING) || await isSuperAdmin(userId)
}

/**
 * Check if user can scan tickets for an event
 */
export async function canScanTickets(userId: string, eventId: string): Promise<boolean> {
  return await hasRole(userId, ROLES.SCANNER, eventId) || await isSuperAdmin(userId)
}

/**
 * Check if user can manage an event
 */
export async function canManageEvent(userId: string, eventId: string): Promise<boolean> {
  return await isEventAdmin(userId, eventId) || await isSuperAdmin(userId)
}

/**
 * Check if user can view event analytics
 */
export async function canViewEventAnalytics(userId: string, eventId: string): Promise<boolean> {
  return (
    await isEventAdmin(userId, eventId) ||
    await hasRole(userId, ROLES.PROMOTER, eventId) ||
    await hasRole(userId, ROLES.ACCOUNTING) ||
    await isSuperAdmin(userId)
  )
}

