'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError, NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { z } from 'zod'
import { canAssignRole, validateRoleUniqueness } from '@/lib/services/admin/roles/validation'
import { isSuperAdmin } from '@/lib/supabase/rls'

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['super_admin', 'event_admin', 'accounting', 'scanner', 'promoter']),
  eventId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
})

export async function assignRole(data: {
  userId: string
  role: string
  eventId?: string
  organizationId?: string
}) {
  const assigner = await requireRole(ROLES.EVENT_ADMIN)

  // Validate input
  const validated = assignRoleSchema.parse(data)

  // Validate assigner can assign this role
  const canAssign = await canAssignRole(assigner.id, validated.role, validated.eventId)
  if (!canAssign.canAssign) {
    throw new AuthorizationError(canAssign.error || 'No tienes permisos para asignar este rol')
  }

  // Validate user exists
  const supabase = await createServiceRoleClient()
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', validated.userId)
    .single()

  if (userError || !user) {
    throw new NotFoundError('User')
  }

  // Validate role doesn't already exist
  const uniquenessCheck = await validateRoleUniqueness(
    validated.userId,
    validated.role,
    validated.eventId,
    validated.organizationId
  )
  if (uniquenessCheck.exists) {
    throw new ValidationError(uniquenessCheck.error || 'El rol ya existe')
  }

  // Only super admin can assign super_admin role
  if (validated.role === ROLES.SUPER_ADMIN && !(await isSuperAdmin(assigner.id))) {
    throw new AuthorizationError('Solo super_admin puede asignar el rol super_admin')
  }

  // Assign role
  const { data: userRole, error: assignError } = await supabase
    .from('user_roles')
    .insert({
      user_id: validated.userId,
      role: validated.role as any,
      event_id: validated.eventId || null,
      organization_id: validated.organizationId || null,
    })
    .select()
    .single()

  if (assignError || !userRole) {
    throw new ValidationError(`Error al asignar rol: ${assignError?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: assigner.id,
      action: 'role_assigned',
      resourceType: 'user_role',
      resourceId: userRole.id,
      metadata: {
        targetUserId: validated.userId,
        targetUserEmail: user.email,
        role: validated.role,
        eventId: validated.eventId,
        organizationId: validated.organizationId,
      },
    },
    request
  )

  return userRole
}

