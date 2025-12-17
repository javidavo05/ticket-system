'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/utils/constants'

export async function getAllEventsForAdmin() {
  await requireRole(ROLES.EVENT_ADMIN)

  const supabase = await createServiceRoleClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      id,
      slug,
      name,
      description,
      event_type,
      start_date,
      end_date,
      location_name,
      location_address,
      status,
      created_at
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return events || []
}

