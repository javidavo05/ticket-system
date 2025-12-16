'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { EVENT_STATUS } from '@/lib/utils/constants'

export interface EventFilters {
  eventType?: string
  startDate?: string
  endDate?: string
  isFree?: boolean
  search?: string
}

export async function getEvents(
  filters: EventFilters = {},
  page: number = 1,
  pageSize: number = 20
) {
  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch (error: any) {
    // If service role key is not configured, return empty results
    console.warn('Service role key not configured, returning empty events list')
    return {
      events: [],
      pagination: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      },
    }
  }

  let query = supabase
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
      ticket_types (
        id,
        name,
        price,
        quantity_available,
        quantity_sold
      )
    `)
    .in('status', [EVENT_STATUS.PUBLISHED, EVENT_STATUS.LIVE])
    .is('deleted_at', null)
    .order('start_date', { ascending: true })

  // Apply filters
  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType)
  }

  if (filters.startDate) {
    query = query.gte('start_date', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('end_date', filters.endDate)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw error
  }

  // Calculate if events are free
  const eventsWithFreeFlag = data?.map(event => {
    const ticketTypes = Array.isArray(event.ticket_types) ? event.ticket_types : [event.ticket_types]
    const isFree = ticketTypes.every(tt => parseFloat(tt.price as string) === 0)
    return {
      ...event,
      isFree,
      ticketTypes,
    }
  }) || []

  // Filter by free/paid if requested
  let filteredEvents = eventsWithFreeFlag
  if (filters.isFree !== undefined) {
    filteredEvents = eventsWithFreeFlag.filter(e => e.isFree === filters.isFree)
  }

  return {
    events: filteredEvents,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  }
}

export async function getEventBySlug(slug: string) {
  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch (error: any) {
    console.warn('Service role key not configured')
    return null
  }

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      ticket_types (
        id,
        name,
        description,
        price,
        quantity_available,
        quantity_sold,
        max_per_purchase,
        is_multi_scan,
        max_scans,
        sale_start,
        sale_end
      ),
      themes (
        id,
        name,
        config
      )
    `)
    .eq('slug', slug)
    .in('status', [EVENT_STATUS.PUBLISHED, EVENT_STATUS.LIVE])
    .is('deleted_at', null)
    .single()

  if (error || !event) {
    return null
  }

  return event
}

