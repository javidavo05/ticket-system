'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { eventUpdateSchema } from '@/lib/utils/validation'
import { ROLES } from '@/lib/utils/constants'
import { ValidationError, AuthorizationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { canModifyEvent, validateEventStateTransition } from '@/lib/services/admin/events/management'

export async function updateEvent(eventId: string, data: {
  slug?: string
  name?: string
  description?: string
  eventType?: string
  startDate?: string
  endDate?: string
  isMultiDay?: boolean
  locationName?: string
  locationAddress?: string
  themeId?: string
  status?: string
}) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  // Validate permissions
  if (!(await canModifyEvent(user.id, eventId))) {
    throw new AuthorizationError('No tienes permisos para modificar este evento')
  }

  const validated = eventUpdateSchema.parse(data)
  const supabase = await createServiceRoleClient()

  // Get current event for validation
  const { data: currentEventData, error: fetchError } = await ((supabase as any)
    .from('events')
    .select('slug, status')
    .eq('id', eventId)
    .single())

  const currentEvent = currentEventData as any

  if (fetchError || !currentEvent) {
    throw new ValidationError('Evento no encontrado')
  }

  // Validate slug uniqueness if changing
  if (validated.slug && validated.slug !== currentEvent.slug) {
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('slug', validated.slug)
      .neq('id', eventId)
      .single()

    if (existing) {
      throw new ValidationError('El slug del evento ya existe')
    }
  }

  // Validate state transition if changing status
  if (validated.status && validated.status !== currentEvent.status) {
    const transition = validateEventStateTransition(currentEvent.status, validated.status)
    if (!transition.valid) {
      throw new ValidationError(transition.error || 'Transición de estado inválida')
    }
  }

  // Prepare update data
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (validated.slug !== undefined) updateData.slug = validated.slug
  if (validated.name !== undefined) updateData.name = validated.name
  if (validated.description !== undefined) updateData.description = validated.description
  if (validated.eventType !== undefined) updateData.event_type = validated.eventType
  if (validated.startDate !== undefined) updateData.start_date = validated.startDate
  if (validated.endDate !== undefined) updateData.end_date = validated.endDate
  if (validated.isMultiDay !== undefined) updateData.is_multi_day = validated.isMultiDay
  if (validated.locationName !== undefined) updateData.location_name = validated.locationName
  if (validated.locationAddress !== undefined) updateData.location_address = validated.locationAddress
  if (validated.themeId !== undefined) updateData.theme_id = validated.themeId || null
  if (validated.status !== undefined) updateData.status = validated.status

  // Update event
  const { data: updatedEvent, error: updateError } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', eventId)
    .select()
    .single()

  if (updateError || !updatedEvent) {
    throw new ValidationError(`Error al actualizar evento: ${updateError?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_updated',
      resourceType: 'event',
      resourceId: eventId,
      changes: {
        before: currentEvent,
        after: updateData,
      },
    },
    request
  )

  return updatedEvent
}

