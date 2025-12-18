'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { AuthorizationError, ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent, checkEventDependencies } from '@/lib/services/admin/events/management'

export async function deleteEvent(eventId: string) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  // Validate permissions
  if (!(await canModifyEvent(user.id, eventId))) {
    throw new AuthorizationError('No tienes permisos para eliminar este evento')
  }

  // Check dependencies
  const dependencies = await checkEventDependencies(eventId)
  if (!dependencies.canDelete) {
    throw new ValidationError(
      `No se puede eliminar el evento: ${dependencies.reasons.join(', ')}`
    )
  }

  const supabase = await createServiceRoleClient()

  // Get event before deletion for audit
  const { data: eventData } = await ((supabase as any)
    .from('events')
    .select('id, name, slug')
    .eq('id', eventId)
    .single())

  const event = eventData as any

  if (!event) {
    throw new ValidationError('Evento no encontrado')
  }

  // Soft delete
  const { error: deleteError } = await ((supabase as any)
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', eventId))

  if (deleteError) {
    throw new ValidationError(`Error al eliminar evento: ${deleteError.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_deleted',
      resourceType: 'event',
      resourceId: eventId,
      metadata: {
        eventName: event.name,
        eventSlug: event.slug,
      },
    },
    request as any
  )

  return { success: true }
}

