'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { AuthorizationError, NotFoundError } from '@/lib/utils/errors'
import { canManageEvent } from '@/lib/auth/permissions'

export async function getEventByIdForAdmin(eventId: string) {
  await requireRole(ROLES.EVENT_ADMIN)

  const supabase = await createServiceRoleClient()

  // Get event with all relations
  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      ticket_types (
        id,
        name,
        price,
        quantity_available,
        quantity_sold,
        created_at
      ),
      event_expenses (
        id,
        category,
        description,
        amount,
        currency,
        expense_date,
        created_at
      ),
      themes (
        id,
        name,
        config
      )
    `)
    .eq('id', eventId)
    .is('deleted_at', null)
    .single()

  if (error || !event) {
    throw new NotFoundError('Event')
  }

  // Note: We already validated role above, but we can add additional checks
  // if needed for event-specific permissions

  return {
    ...event,
    ticketTypes: Array.isArray(event.ticket_types) ? event.ticket_types : [],
    expenses: Array.isArray(event.event_expenses) ? event.event_expenses : [],
    theme: Array.isArray(event.themes) ? event.themes[0] : event.themes,
  }
}

