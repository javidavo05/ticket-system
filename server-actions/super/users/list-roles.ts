'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'

export async function listRoles() {
  await requireSuperAdmin()

  // TODO: Implement actual roles retrieval from database
  return [
    {
      name: ROLES.SUPER_ADMIN,
      description: 'Full platform access',
      permissions: ['*'],
      hardLimits: {},
    },
    {
      name: ROLES.EVENT_ADMIN,
      description: 'Event management access',
      permissions: ['events:read', 'events:write', 'tickets:read'],
      hardLimits: { maxPerTenant: 5 },
    },
    {
      name: ROLES.ACCOUNTING,
      description: 'Financial data access',
      permissions: ['finance:read', 'reports:read'],
      hardLimits: {},
    },
    {
      name: ROLES.SCANNER,
      description: 'Ticket scanning access',
      permissions: ['tickets:scan'],
      hardLimits: { maxPerEvent: 10 },
    },
    {
      name: ROLES.PROMOTER,
      description: 'Promoter access',
      permissions: ['tickets:read', 'tickets:assign'],
      hardLimits: {},
    },
  ]
}
