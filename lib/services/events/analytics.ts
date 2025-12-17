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
  const { data: tickets, error: ticketsError } = await (supabase
    .from('tickets')
    .select('id, status, scan_count, payment_id, ticket_type_id, ticket_types!inner(name, price)')
    .eq('event_id', eventId) as any)

  if (ticketsError) {
    throw ticketsError
  }

  const ticketsData = (tickets || []) as any[]
  const ticketsSold = ticketsData.length
  const ticketsScanned = ticketsData.filter((t: any) => t.scan_count > 0).length
  const attendance = ticketsData.filter((t: any) => t.status === 'used').length

  // Calculate revenue from payments
  const paymentIds = ticketsData.map((t: any) => t.payment_id).filter(Boolean)
  const { data: payments, error: paymentsError } = await (supabase
    .from('payments')
    .select('amount, status')
    .eq('status', 'completed')
    .in('id', paymentIds.length > 0 ? paymentIds : ['00000000-0000-0000-0000-000000000000']) as any)

  if (paymentsError) {
    throw paymentsError
  }

  const revenue = ((payments as any[]) || []).reduce((sum, p: any) => sum + parseFloat(p.amount as string), 0) || 0

  // Ticket type distribution
  const ticketTypeMap = new Map<string, { name: string; sold: number; revenue: number }>()

  ticketsData.forEach((ticket: any) => {
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

