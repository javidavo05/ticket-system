import { getReadReplicaClient, buildAnalyticsQuery, executeAnalyticsQuery } from './query-optimization'

export interface EventPerformanceMetrics {
  eventId: string
  eventName: string
  ticketsAvailable: number
  ticketsSold: number
  ticketsScanned: number
  conversionRate: number
  attendanceRate: number
  totalRevenue: number
  ticketTypeBreakdown: Array<{
    ticketTypeId: string
    ticketTypeName: string
    available: number
    sold: number
    revenue: number
    percentage: number
  }>
  salesTrend: Array<{
    date: string
    ticketsSold: number
    revenue: number
  }>
}

export interface EventComparison {
  events: Array<{
    eventId: string
    eventName: string
    ticketsSold: number
    revenue: number
    attendanceRate: number
  }>
  summary: {
    totalEvents: number
    totalTicketsSold: number
    totalRevenue: number
    averageAttendanceRate: number
  }
}

/**
 * Get comprehensive event performance metrics
 */
export async function getEventPerformance(
  eventId: string,
  dateRange?: { start: string; end: string }
): Promise<EventPerformanceMetrics> {
  const supabase = await getReadReplicaClient()

  // Get event info
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .is('deleted_at', null)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  // Get ticket types with availability
  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from('ticket_types')
    .select('id, name, quantity_available, quantity_sold, price')
    .eq('event_id', eventId)

  if (ticketTypesError) {
    throw new Error(`Error fetching ticket types: ${ticketTypesError.message}`)
  }

  const totalAvailable = (ticketTypes || []).reduce((sum, tt) => sum + tt.quantity_available, 0)
  const totalSold = (ticketTypes || []).reduce((sum, tt) => sum + (tt.quantity_sold || 0), 0)

  // Get tickets with filters
  let ticketsQuery = supabase
    .from('tickets')
    .select('id, status, scan_count, ticket_type_id, created_at, ticket_types!inner(name, price)')
    .eq('event_id', eventId)

  if (dateRange) {
    ticketsQuery = ticketsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { data: tickets, error: ticketsError } = await ticketsQuery

  if (ticketsError) {
    throw new Error(`Error fetching tickets: ${ticketsError.message}`)
  }

  const ticketsSold = (tickets || []).filter((t) => t.status === 'paid' || t.status === 'used').length
  const ticketsScanned = (tickets || []).filter((t) => t.scan_count > 0).length

  // Get revenue from payments
  let paymentsQuery = supabase
    .from('payments')
    .select('amount, amount_paid, status')
    .eq('status', 'completed')

  // Get payment IDs from tickets
  const paymentIds = (tickets || [])
    .map((t) => t.payment_id)
    .filter(Boolean) as string[]

  if (paymentIds.length > 0) {
    paymentsQuery = paymentsQuery.in('id', paymentIds)
  } else {
    // No payments, return zero revenue
    paymentsQuery = paymentsQuery.eq('id', '00000000-0000-0000-0000-000000000000') // Force no results
  }

  const { data: payments } = await paymentsQuery

  const totalRevenue = (payments || []).reduce((sum, p) => {
    return sum + parseFloat((p.amount_paid || p.amount || '0') as string)
  }, 0)

  // Ticket type breakdown
  const ticketTypeMap = new Map<string, { name: string; available: number; sold: number; revenue: number }>()

  ticketTypes?.forEach((tt) => {
    ticketTypeMap.set(tt.id, {
      name: tt.name,
      available: tt.quantity_available,
      sold: tt.quantity_sold || 0,
      revenue: 0,
    })
  })

  tickets?.forEach((ticket) => {
    const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
    if (ticketType && (ticket.status === 'paid' || ticket.status === 'used')) {
      const existing = ticketTypeMap.get(ticket.ticket_type_id) || {
        name: ticketType.name,
        available: 0,
        sold: 0,
        revenue: 0,
      }
      existing.sold++
      existing.revenue += parseFloat(ticketType.price as string)
      ticketTypeMap.set(ticket.ticket_type_id, existing)
    }
  })

  const ticketTypeBreakdown = Array.from(ticketTypeMap.entries()).map(([id, data]) => ({
    ticketTypeId: id,
    ticketTypeName: data.name,
    available: data.available,
    sold: data.sold,
    revenue: data.revenue,
    percentage: totalSold > 0 ? (data.sold / totalSold) * 100 : 0,
  }))

  // Sales trend (group by day)
  const salesByDate = new Map<string, { ticketsSold: number; revenue: number }>()

  tickets?.forEach((ticket) => {
    if (ticket.status === 'paid' || ticket.status === 'used') {
      const date = new Date(ticket.created_at).toISOString().split('T')[0]
      const existing = salesByDate.get(date) || { ticketsSold: 0, revenue: 0 }
      existing.ticketsSold++
      const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
      if (ticketType) {
        existing.revenue += parseFloat(ticketType.price as string)
      }
      salesByDate.set(date, existing)
    }
  })

  const salesTrend = Array.from(salesByDate.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    eventId: event.id,
    eventName: event.name,
    ticketsAvailable: totalAvailable,
    ticketsSold,
    ticketsScanned,
    conversionRate: totalAvailable > 0 ? (ticketsSold / totalAvailable) * 100 : 0,
    attendanceRate: ticketsSold > 0 ? (ticketsScanned / ticketsSold) * 100 : 0,
    totalRevenue,
    ticketTypeBreakdown,
    salesTrend,
  }
}

/**
 * Compare multiple events
 */
export async function getEventComparison(
  eventIds: string[],
  dateRange?: { start: string; end: string }
): Promise<EventComparison> {
  const supabase = await getReadReplicaClient()

  const eventsData = await Promise.all(
    eventIds.map(async (eventId) => {
      const performance = await getEventPerformance(eventId, dateRange)
      return {
        eventId: performance.eventId,
        eventName: performance.eventName,
        ticketsSold: performance.ticketsSold,
        revenue: performance.totalRevenue,
        attendanceRate: performance.attendanceRate,
      }
    })
  )

  const summary = {
    totalEvents: eventsData.length,
    totalTicketsSold: eventsData.reduce((sum, e) => sum + e.ticketsSold, 0),
    totalRevenue: eventsData.reduce((sum, e) => sum + e.revenue, 0),
    averageAttendanceRate:
      eventsData.length > 0
        ? eventsData.reduce((sum, e) => sum + e.attendanceRate, 0) / eventsData.length
        : 0,
  }

  return {
    events: eventsData,
    summary,
  }
}

/**
 * Get sales trend for an event
 */
export async function getEventSalesTrend(
  eventId: string,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<Array<{ period: string; ticketsSold: number; revenue: number }>> {
  const supabase = await getReadReplicaClient()

  // Get tickets with payments
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, status, created_at, ticket_types!inner(price)')
    .eq('event_id', eventId)
    .in('status', ['paid', 'used'])

  if (ticketsError) {
    throw new Error(`Error fetching tickets: ${ticketsError.message}`)
  }

  const salesByPeriod = new Map<string, { ticketsSold: number; revenue: number }>()

  tickets?.forEach((ticket) => {
    const date = new Date(ticket.created_at)
    let period: string

    switch (granularity) {
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        period = weekStart.toISOString().split('T')[0]
        break
      case 'month':
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break
      default:
        period = date.toISOString().split('T')[0]
    }

    const existing = salesByPeriod.get(period) || { ticketsSold: 0, revenue: 0 }
    existing.ticketsSold++
    const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
    if (ticketType) {
      existing.revenue += parseFloat(ticketType.price as string)
    }
    salesByPeriod.set(period, existing)
  })

  return Array.from(salesByPeriod.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

