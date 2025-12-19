'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { assignThemeToEventSchema } from '@/lib/services/admin/themes/validation'
import { invalidateEventTheme } from '@/lib/services/themes/cache-strategy'
import {
  validateThemeExists,
  validateEventExists,
} from '@/lib/services/admin/themes/helpers'

export async function assignThemeToEvent(themeId: string, eventId: string) {
  const user = await requireSuperAdmin()

  // Validate input
  const validated = assignThemeToEventSchema.parse({ themeId, eventId })

  // Validate theme exists and is active
  await validateThemeExists(validated.themeId)

  // Validate event exists
  await validateEventExists(validated.eventId)

  const supabase = await createServiceRoleClient()

  // Check theme is active
  const { data: themeData, error: themeError } = await supabase
    .from('themes')
    .select('id, name, is_active')
    .eq('id', validated.themeId)
    .single()

  if (themeError || !themeData) {
    throw new NotFoundError('Theme')
  }

  const theme = themeData as {
    id: string
    name: string
    is_active: boolean
  }

  if (!theme.is_active) {
    throw new Error('Cannot assign inactive theme to event')
  }

  // Get event info for audit
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, slug, theme_id')
    .eq('id', validated.eventId)
    .single()

  if (eventError || !event) {
    throw new NotFoundError('Event')
  }

  // Update event with new theme
  const { error: updateError } = await ((supabase as any)
    .from('events')
    .update({
      theme_id: validated.themeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.eventId))

  if (updateError) {
    throw new Error(`Failed to assign theme to event: ${updateError.message}`)
  }

  // Invalidate event theme cache
  await invalidateEventTheme(validated.eventId)

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_assigned_to_event',
      resourceType: 'theme',
      resourceId: validated.themeId,
      metadata: {
        themeName: theme.name,
        eventId: validated.eventId,
        eventName: event.name,
        eventSlug: event.slug,
        previousThemeId: event.theme_id || null,
      },
    },
    request
  )

  return {
    success: true,
    themeId: validated.themeId,
    eventId: validated.eventId,
  }
}
