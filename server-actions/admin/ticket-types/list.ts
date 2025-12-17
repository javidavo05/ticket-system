'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'
import { AuthorizationError, NotFoundError } from '@/lib/utils/errors'
import { canManageEvent } from '@/lib/auth/permissions'

export async function getTicketTypesForEvent(eventId: string) {
  await requireRole(ROLES.EVENT_ADMIN)

  const supabase = await createServiceRoleClient()

  // Verify event exists and user has access
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .is('deleted_at', null)
    .single()

  if (!event) {
    throw new NotFoundError('Event')
  }

  // Get ticket types with statistics
  const { data: ticketTypes, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Error al obtener tipos de tickets: ${error.message}`)
  }

  // Calculate available quantity for each
  return (ticketTypes || []).map((tt) => ({
    ...tt,
    available: Math.max(0, tt.quantity_available - (tt.quantity_sold || 0)),
    price: parseFloat(tt.price as string),
  }))
}

