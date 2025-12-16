import { createServiceRoleClient } from '@/lib/supabase/server'

export interface EventAnalytics {
  ticketsSold: number
  ticketsScanned: number
  revenue: number
  attendance: number
  ticketTypeDistribution: Array<{
    ticketTypeId: string
    ticketTypeName: string
    sold: number
    revenue: number
  }>
}

export async function getEventAnalytics(eventId: string): Promise<EventAnalytics> {
  const supabase = await createServiceRoleClient()

  // Get tickets sold
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, status, scan_count, ticket_types!inner(name, price)')
    .eq('event_id', eventId)

  if (ticketsError) {
    throw ticketsError
  }

  const ticketsSold = tickets?.length || 0
  const ticketsScanned = tickets?.filter(t => t.scan_count > 0).length || 0
  const attendance = tickets?.filter(t => t.status === 'used').length || 0

  // Calculate revenue from payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('status', 'completed')
    .in('id', tickets?.map(t => t.payment_id).filter(Boolean) || [])

  if (paymentsError) {
    throw paymentsError
  }

  const revenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount as string), 0) || 0

  // Ticket type distribution
  const ticketTypeMap = new Map<string, { name: string; sold: number; revenue: number }>()

  tickets?.forEach(ticket => {
    const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
    if (ticketType) {
      const existing = ticketTypeMap.get(ticket.ticket_type_id) || {
        name: ticketType.name,
        sold: 0,
        revenue: 0,
      }
      existing.sold++
      if (ticket.status === 'paid') {
        existing.revenue += parseFloat(ticketType.price as string)
      }
      ticketTypeMap.set(ticket.ticket_type_id, existing)
    }
  })

  const ticketTypeDistribution = Array.from(ticketTypeMap.entries()).map(([id, data]) => ({
    ticketTypeId: id,
    ticketTypeName: data.name,
    sold: data.sold,
    revenue: data.revenue,
  }))

  return {
    ticketsSold,
    ticketsScanned,
    revenue,
    attendance,
    ticketTypeDistribution,
  }
}

