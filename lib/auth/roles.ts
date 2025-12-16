import { ROLES } from '@/lib/utils/constants'

export type UserRole = typeof ROLES[keyof typeof ROLES]

export const ROLE_HIERARCHY: Record<string, number> = {
  [ROLES.SUPER_ADMIN]: 5,
  [ROLES.EVENT_ADMIN]: 4,
  [ROLES.ACCOUNTING]: 3,
  [ROLES.SCANNER]: 2,
  [ROLES.PROMOTER]: 1,
}

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

