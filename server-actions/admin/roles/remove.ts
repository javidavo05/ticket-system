'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError, NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'
import { validateLastSuperAdmin } from '@/lib/services/admin/roles/validation'
import { isSuperAdmin } from '@/lib/supabase/rls'

const removeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['super_admin', 'event_admin', 'accounting', 'scanner', 'promoter']),
  eventId: z.string().uuid().optional(),
})

export async function removeRole(data: {
  userId: string
  role: string
  eventId?: string
}) {
  const remover = await requireRole(ROLES.EVENT_ADMIN)

  // Validate input
  const validated = removeRoleSchema.parse(data)

  // Only super admin can remove super_admin role
  if (validated.role === ROLES.SUPER_ADMIN && !(await isSuperAdmin(remover.id))) {
    throw new AuthorizationError('Solo super_admin puede remover el rol super_admin')
  }

  // Validate last super admin
  if (validated.role === ROLES.SUPER_ADMIN) {
    const lastAdminCheck = await validateLastSuperAdmin(validated.userId)
    if (!lastAdminCheck.canRemove) {
      throw new ValidationError(lastAdminCheck.error || 'No se puede remover el último super_admin')
    }
  }

  const supabase = await createServiceRoleClient()

  // Get user for audit
  const { data: user } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', validated.userId)
    .single()

  // Find and remove role
  let query = supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', validated.userId)
    .eq('role', validated.role)

  if (validated.eventId) {
    query = query.eq('event_id', validated.eventId)
  } else {
    query = query.is('event_id', null)
  }

  const { data: userRole, error: findError } = await query.single()

  if (findError || !userRole) {
    throw new NotFoundError('User role')
  }

  // Remove role
  const { error: removeError } = await supabase
    .from('user_roles')
    .delete()
    .eq('id', userRole.id)

  if (removeError) {
    throw new ValidationError(`Error al remover rol: ${removeError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: remover.id,
      action: 'role_removed',
      resourceType: 'user_role',
      resourceId: userRole.id,
      metadata: {
        targetUserId: validated.userId,
        targetUserEmail: user?.email,
        role: validated.role,
        eventId: validated.eventId,
      },
    },
    request
  )

  return { success: true }
}

