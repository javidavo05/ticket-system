'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES, EVENT_STATUS } from '@/lib/utils/constants'
import { AuthorizationError, ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent, validateEventCanBePublished } from '@/lib/services/admin/events/management'

export async function publishEvent(eventId: string) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  // Validate permissions
  if (!(await canModifyEvent(user.id, eventId))) {
    throw new AuthorizationError('No tienes permisos para publicar este evento')
  }

  // Validate event can be published
  const validation = await validateEventCanBePublished(eventId)
  if (!validation.canPublish) {
    throw new ValidationError(
      `No se puede publicar el evento: ${validation.reasons.join(', ')}`
    )
  }

  const supabase = await createServiceRoleClient()

  // Update status to published
  const { data: event, error: updateError } = await supabase
    .from('events')
    .update({
      status: EVENT_STATUS.PUBLISHED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single()

  if (updateError || !event) {
    throw new ValidationError(`Error al publicar evento: ${updateError?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_published',
      resourceType: 'event',
      resourceId: eventId,
      metadata: {
        previousStatus: 'draft',
        newStatus: EVENT_STATUS.PUBLISHED,
      },
    },
    request
  )

  return event
}

