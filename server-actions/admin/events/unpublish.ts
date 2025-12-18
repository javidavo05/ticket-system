'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES, EVENT_STATUS } from '@/lib/utils/constants'
import { AuthorizationError, ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent } from '@/lib/services/admin/events/management'

export async function unpublishEvent(eventId: string) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  // Validate permissions
  if (!(await canModifyEvent(user.id, eventId))) {
    throw new AuthorizationError('No tienes permisos para despublicar este evento')
  }

  const supabase = await createServiceRoleClient()

  // Get current event status
  const { data: currentEventData, error: fetchError } = await ((supabase as any)
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single())

  const currentEvent = currentEventData as any

  if (fetchError || !currentEvent) {
    throw new ValidationError('Evento no encontrado')
  }

  // Cannot unpublish if event is live
  if (currentEvent.status === EVENT_STATUS.LIVE) {
    throw new ValidationError('No se puede despublicar un evento que está en vivo')
  }

  // Update status to draft
  const { data: event, error: updateError } = await ((supabase as any)
    .from('events')
    .update({
      status: EVENT_STATUS.DRAFT,
      updated_at: new Date().toISOString(),
    }))
    .eq('id', eventId)
    .select()
    .single()

  if (updateError || !event) {
    throw new ValidationError(`Error al despublicar evento: ${updateError?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_unpublished',
      resourceType: 'event',
      resourceId: eventId,
      metadata: {
        previousStatus: currentEvent.status,
        newStatus: EVENT_STATUS.DRAFT,
      },
    },
    request as any
  )

  return event
}

