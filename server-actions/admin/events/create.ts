'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { eventCreateSchema } from '@/lib/utils/validation'
import { ROLES, EVENT_STATUS } from '@/lib/utils/constants'
import { ValidationError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'

export async function createEvent(formData: FormData) {
  const user = await requireRole(ROLES.EVENT_ADMIN)

  const data = {
    slug: formData.get('slug') as string,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    eventType: formData.get('eventType') as string,
    startDate: formData.get('startDate') as string,
    endDate: formData.get('endDate') as string,
    isMultiDay: formData.get('isMultiDay') === 'true',
    locationName: formData.get('locationName') as string,
    locationAddress: formData.get('locationAddress') as string,
    themeId: formData.get('themeId') as string | undefined,
  }

  const validated = eventCreateSchema.parse(data)

  const supabase = await createServiceRoleClient()

  // Check if slug is unique
  const { data: existing } = await supabase
    .from('events')
    .select('id')
    .eq('slug', validated.slug)
    .single()

  if (existing) {
    throw new ValidationError('El slug del evento ya existe')
  }

  // Create event
  const { data: event, error } = await ((supabase as any)
    .from('events')
    .insert({
      slug: validated.slug,
      name: validated.name,
      description: validated.description,
      event_type: validated.eventType as any,
      start_date: validated.startDate,
      end_date: validated.endDate,
      is_multi_day: validated.isMultiDay,
      location_name: validated.locationName,
      location_address: validated.locationAddress,
      theme_id: validated.themeId,
      status: EVENT_STATUS.DRAFT,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !event) {
    throw new Error(`Error al crear el evento: ${error?.message}`)
  }

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'event_created',
      resourceType: 'event',
      resourceId: event.id,
      metadata: {
        slug: validated.slug,
        name: validated.name,
      },
    },
    request
  )

  return event
}

