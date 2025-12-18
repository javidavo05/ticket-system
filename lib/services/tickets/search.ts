import { createServiceRoleClient } from '@/lib/supabase/server'

export interface TicketSearchCriteria {
  ticketId?: string
  ticketNumber?: string
  purchaserEmail?: string
  purchaserName?: string
  assignedToEmail?: string
  assignedToName?: string
  nationalId?: string
  eventId?: string
  status?: string | string[]
  limit?: number
  offset?: number
}

export interface TicketSearchResult {
  id: string
  ticketNumber: string
  eventId: string
  eventName: string
  ticketTypeId: string
  ticketTypeName: string
  purchaserId: string | null
  purchaserEmail: string
  purchaserName: string
  assignedToEmail: string | null
  assignedToName: string | null
  status: string
  scanCount: number
  firstScanAt: string | null
  lastScanAt: string | null
  revokedAt: string | null
  createdAt: string
  paymentId: string | null
}

/**
 * Search tickets by multiple criteria
 */
export async function searchTickets(criteria: TicketSearchCriteria): Promise<{
  tickets: TicketSearchResult[]
  total: number
}> {
  const supabase = await createServiceRoleClient()

  const limit = criteria.limit || 50
  const offset = criteria.offset || 0

  // Build query with joins
  let query = supabase
    .from('tickets')
    .select(
      `
      id,
      ticket_number,
      event_id,
      ticket_type_id,
      purchaser_id,
      purchaser_email,
      purchaser_name,
      assigned_to_email,
      assigned_to_name,
      status,
      scan_count,
      first_scan_at,
      last_scan_at,
      revoked_at,
      created_at,
      payment_id,
      events!inner(id, name),
      ticket_types!inner(id, name)
    `,
      { count: 'exact' }
    )

  // Apply filters
  if (criteria.ticketId) {
    query = query.eq('id', criteria.ticketId)
  }

  if (criteria.ticketNumber) {
    query = query.ilike('ticket_number', `%${criteria.ticketNumber}%`)
  }

  if (criteria.purchaserEmail) {
    query = query.ilike('purchaser_email', `%${criteria.purchaserEmail}%`)
  }

  if (criteria.purchaserName) {
    query = query.ilike('purchaser_name', `%${criteria.purchaserName}%`)
  }

  if (criteria.assignedToEmail) {
    query = query.ilike('assigned_to_email', `%${criteria.assignedToEmail}%`)
  }

  if (criteria.assignedToName) {
    query = query.ilike('assigned_to_name', `%${criteria.assignedToName}%`)
  }

  if (criteria.eventId) {
    query = query.eq('event_id', criteria.eventId)
  }

  if (criteria.status) {
    if (Array.isArray(criteria.status)) {
      query = query.in('status', criteria.status)
    } else {
      query = query.eq('status', criteria.status)
    }
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Error searching tickets: ${error.message}`)
  }

  // Transform results
  const tickets: TicketSearchResult[] =
    data?.map((ticket: any) => {
      const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events
      const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types

      return {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        eventId: ticket.event_id,
        eventName: event?.name || '',
        ticketTypeId: ticket.ticket_type_id,
        ticketTypeName: ticketType?.name || '',
        purchaserId: ticket.purchaser_id,
        purchaserEmail: ticket.purchaser_email,
        purchaserName: ticket.purchaser_name,
        assignedToEmail: ticket.assigned_to_email,
        assignedToName: ticket.assigned_to_name,
        status: ticket.status,
        scanCount: ticket.scan_count,
        firstScanAt: ticket.first_scan_at,
        lastScanAt: ticket.last_scan_at,
        revokedAt: ticket.revoked_at,
        createdAt: ticket.created_at,
        paymentId: ticket.payment_id,
      }
    }) || []

  // If nationalId is provided, filter by joining with users
  if (criteria.nationalId) {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .ilike('national_id', `%${criteria.nationalId}%`)

    const usersData = (users || []) as any[]
    const userIds = usersData.map((u: any) => u.id)

    if (userIds.length > 0) {
      const ticketsData = tickets as any[]
      const filteredTickets = ticketsData.filter((t: any) => t.purchaserId && userIds.includes(t.purchaserId))
      return {
        tickets: filteredTickets,
        total: filteredTickets.length,
      }
    } else {
      return {
        tickets: [],
        total: 0,
      }
    }
  }

  return {
    tickets,
    total: count || 0,
  }
}

/**
 * Get ticket by ID with full details
 */
export async function getTicketById(ticketId: string): Promise<TicketSearchResult | null> {
  const result = await searchTickets({ ticketId, limit: 1 })

  if (result.tickets.length === 0) {
    return null
  }

  return result.tickets[0]
}

