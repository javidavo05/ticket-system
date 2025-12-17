import { getReadReplicaClient, buildAnalyticsQuery } from './query-optimization'

export interface EventRevenue {
  eventId: string
  totalRevenue: number
  revenueByTicketType: Array<{
    ticketTypeId: string
    ticketTypeName: string
    revenue: number
    percentage: number
  }>
  revenueByProvider: Array<{
    provider: string
    revenue: number
    percentage: number
  }>
  revenueByPaymentMethod: Array<{
    method: string
    revenue: number
    percentage: number
  }>
  revenueTrend: Array<{
    date: string
    revenue: number
  }>
}

export interface RevenueBreakdown {
  eventId: string
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  revenueByCategory: Array<{
    category: string
    revenue: number
  }>
  expensesByCategory: Array<{
    category: string
    amount: number
  }>
}

/**
 * Get comprehensive revenue metrics for an event
 */
export async function getEventRevenue(
  eventId: string,
  dateRange?: { start: string; end: string }
): Promise<EventRevenue> {
  const supabase = await getReadReplicaClient()

  // Get payment IDs from tickets for this event
  const { data: tickets } = await supabase.from('tickets').select('payment_id').eq('event_id', eventId)

  const paymentIds = (tickets || [])
    .map((t) => t.payment_id)
    .filter(Boolean) as string[]

  if (paymentIds.length === 0) {
    // No payments, return empty result
    return {
      eventId,
      totalRevenue: 0,
      revenueByTicketType: [],
      revenueByProvider: [],
      revenueByPaymentMethod: [],
      revenueTrend: [],
    }
  }

  // Get payments for event
  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, amount_paid, status, provider, payment_method, created_at')
    .eq('status', 'completed')
    .in('id', paymentIds)

  if (dateRange) {
    paymentsQuery = paymentsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { data: payments, error: paymentsError } = await paymentsQuery

  if (paymentsError) {
    throw new Error(`Error fetching payments: ${paymentsError.message}`)
  }

  const totalRevenue = (payments || []).reduce((sum, p) => {
    return sum + parseFloat((p.amount_paid || p.amount || '0') as string)
  }, 0)

  // Revenue by provider
  const revenueByProviderMap = new Map<string, number>()
  payments?.forEach((p) => {
    const provider = p.provider || 'unknown'
    const amount = parseFloat((p.amount_paid || p.amount || '0') as string)
    revenueByProviderMap.set(provider, (revenueByProviderMap.get(provider) || 0) + amount)
  })

  const revenueByProvider = Array.from(revenueByProviderMap.entries())
    .map(([provider, revenue]) => ({
      provider,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Revenue by payment method
  const revenueByMethodMap = new Map<string, number>()
  payments?.forEach((p) => {
    const method = p.payment_method || 'unknown'
    const amount = parseFloat((p.amount_paid || p.amount || '0') as string)
    revenueByMethodMap.set(method, (revenueByMethodMap.get(method) || 0) + amount)
  })

  const revenueByPaymentMethod = Array.from(revenueByMethodMap.entries())
    .map(([method, revenue]) => ({
      method,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Revenue by ticket type
  const { data: ticketTypes } = await supabase
    .from('ticket_types')
    .select('id, name, price')
    .eq('event_id', eventId)

  const revenueByTicketTypeMap = new Map<string, { name: string; revenue: number }>()

  // Get tickets with their types
  const { data: ticketsWithTypes } = await supabase
    .from('tickets')
    .select('id, ticket_type_id, payment_id, ticket_types!inner(name, price)')
    .eq('event_id', eventId)
    .in('status', ['paid', 'used'])

  const paymentIdToAmount = new Map<string, number>()
  payments?.forEach((p) => {
    paymentIdToAmount.set(p.id, parseFloat((p.amount_paid || p.amount || '0') as string))
  })

  ticketsWithTypes?.forEach((ticket) => {
    const ticketType = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types
    if (ticketType && ticket.payment_id) {
      const paymentAmount = paymentIdToAmount.get(ticket.payment_id) || 0
      // Distribute payment amount proportionally (simplified - assumes equal distribution)
      const existing = revenueByTicketTypeMap.get(ticket.ticket_type_id) || {
        name: ticketType.name,
        revenue: 0,
      }
      existing.revenue += parseFloat(ticketType.price as string)
      revenueByTicketTypeMap.set(ticket.ticket_type_id, existing)
    }
  })

  const revenueByTicketType = Array.from(revenueByTicketTypeMap.entries())
    .map(([ticketTypeId, data]) => ({
      ticketTypeId,
      ticketTypeName: data.name,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Revenue trend
  const revenueByDate = new Map<string, number>()
  payments?.forEach((p) => {
    const date = new Date(p.created_at).toISOString().split('T')[0]
    const amount = parseFloat((p.amount_paid || p.amount || '0') as string)
    revenueByDate.set(date, (revenueByDate.get(date) || 0) + amount)
  })

  const revenueTrend = Array.from(revenueByDate.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    eventId,
    totalRevenue,
    revenueByTicketType,
    revenueByProvider,
    revenueByPaymentMethod,
    revenueTrend,
  }
}

/**
 * Get detailed revenue breakdown with expenses
 */
export async function getRevenueBreakdown(eventId: string): Promise<RevenueBreakdown> {
  const supabase = await getReadReplicaClient()

  // Get revenue
  const revenue = await getEventRevenue(eventId)

  // Get expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('event_expenses')
    .select('category, amount')
    .eq('event_id', eventId)

  if (expensesError) {
    throw new Error(`Error fetching expenses: ${expensesError.message}`)
  }

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.amount as string), 0)

  // Expenses by category
  const expensesByCategoryMap = new Map<string, number>()
  expenses?.forEach((e) => {
    const category = e.category || 'other'
    expensesByCategoryMap.set(category, (expensesByCategoryMap.get(category) || 0) + parseFloat(e.amount as string))
  })

  const expensesByCategory = Array.from(expensesByCategoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  // Revenue by category (using ticket types as categories)
  const revenueByCategory = revenue.revenueByTicketType.map((rt) => ({
    category: rt.ticketTypeName,
    revenue: rt.revenue,
  }))

  const netProfit = revenue.totalRevenue - totalExpenses
  const profitMargin = revenue.totalRevenue > 0 ? (netProfit / revenue.totalRevenue) * 100 : 0

  return {
    eventId,
    totalRevenue: revenue.totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    revenueByCategory,
    expensesByCategory,
  }
}

/**
 * Get event profitability metrics
 */
export async function getEventProfitability(eventId: string): Promise<{
  eventId: string
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  roi: number
  breakEvenPoint: number
}> {
  const breakdown = await getRevenueBreakdown(eventId)

  // Calculate ROI (simplified - assumes expenses are the investment)
  const roi = breakdown.totalExpenses > 0 ? ((breakdown.netProfit / breakdown.totalExpenses) * 100) : 0

  // Break-even point (revenue needed to cover expenses)
  const breakEvenPoint = breakdown.totalExpenses

  return {
    eventId: breakdown.eventId,
    totalRevenue: breakdown.totalRevenue,
    totalExpenses: breakdown.totalExpenses,
    netProfit: breakdown.netProfit,
    profitMargin: breakdown.profitMargin,
    roi,
    breakEvenPoint,
  }
}

/**
 * Get platform-wide revenue metrics
 */
export async function getPlatformRevenue(dateRange?: { start: string; end: string }): Promise<{
  totalRevenue: number
  revenueByEvent: Array<{
    eventId: string
    eventName: string
    revenue: number
    percentage: number
  }>
  revenueByPeriod: Array<{
    period: string
    revenue: number
  }>
  revenueTrend: Array<{
    date: string
    revenue: number
  }>
}> {
  const supabase = await getReadReplicaClient()

  // Get all completed payments
  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, amount_paid, status, created_at')
    .eq('status', 'completed')

  if (dateRange) {
    paymentsQuery = paymentsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { data: payments, error: paymentsError } = await paymentsQuery

  if (paymentsError) {
    throw new Error(`Error fetching payments: ${paymentsError.message}`)
  }

  const totalRevenue = (payments || []).reduce((sum, p) => {
    return sum + parseFloat((p.amount_paid || p.amount || '0') as string)
  }, 0)

  // Get events for payments
  const paymentIds = (payments || []).map((p) => p.id)
  const { data: tickets } = await supabase
    .from('tickets')
    .select('event_id, payment_id, events!inner(id, name)')
    .in('payment_id', paymentIds.length > 0 ? paymentIds : ['00000000-0000-0000-0000-000000000000'])

  // Revenue by event
  const revenueByEventMap = new Map<string, { name: string; revenue: number }>()
  const paymentIdToAmount = new Map<string, number>()
  payments?.forEach((p) => {
    paymentIdToAmount.set(p.id, parseFloat((p.amount_paid || p.amount || '0') as string))
  })

  tickets?.forEach((ticket) => {
    const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events
    if (event && ticket.payment_id) {
      const amount = paymentIdToAmount.get(ticket.payment_id) || 0
      const existing = revenueByEventMap.get(ticket.event_id) || { name: event.name, revenue: 0 }
      existing.revenue += amount
      revenueByEventMap.set(ticket.event_id, existing)
    }
  })

  const revenueByEvent = Array.from(revenueByEventMap.entries())
    .map(([eventId, data]) => ({
      eventId,
      eventName: data.name,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Revenue by period (month)
  const revenueByPeriodMap = new Map<string, number>()
  payments?.forEach((p) => {
    const date = new Date(p.created_at)
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const amount = parseFloat((p.amount_paid || p.amount || '0') as string)
    revenueByPeriodMap.set(period, (revenueByPeriodMap.get(period) || 0) + amount)
  })

  const revenueByPeriod = Array.from(revenueByPeriodMap.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period))

  // Revenue trend (by day)
  const revenueByDate = new Map<string, number>()
  payments?.forEach((p) => {
    const date = new Date(p.created_at).toISOString().split('T')[0]
    const amount = parseFloat((p.amount_paid || p.amount || '0') as string)
    revenueByDate.set(date, (revenueByDate.get(date) || 0) + amount)
  })

  const revenueTrend = Array.from(revenueByDate.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalRevenue,
    revenueByEvent,
    revenueByPeriod,
    revenueTrend,
  }
}

