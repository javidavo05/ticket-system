'use server'

import { requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEventAnalytics } from '@/lib/services/events/analytics'
import { ROLES } from '@/lib/utils/constants'

export async function getEventRevenue(eventId: string, dateRange?: { start: string; end: string }) {
  await requireRole(ROLES.ACCOUNTING)

  const analytics = await getEventAnalytics(eventId)
  return analytics
}

export async function getPlatformKPIs(dateRange?: { start: string; end: string }) {
  await requireRole(ROLES.ACCOUNTING)

  const supabase = await createServiceRoleClient()

  let paymentsQuery = supabase
    .from('payments')
    .select('amount, status, created_at')
    .eq('status', 'completed')

  if (dateRange) {
    paymentsQuery = paymentsQuery
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
  }

  const { data: payments } = await paymentsQuery

  const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount as string), 0) || 0

  let eventsQuery = supabase
    .from('events')
    .select('id')

  if (dateRange) {
    eventsQuery = eventsQuery
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
  }

  const { data: events } = await eventsQuery
  const totalEvents = events?.length || 0

  let ticketsQuery = supabase
    .from('tickets')
    .select('id, status')

  if (dateRange) {
    ticketsQuery = ticketsQuery
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
  }

  const { data: tickets } = await ticketsQuery
  const totalTickets = tickets?.length || 0
  const ticketsSold = tickets?.filter(t => t.status === 'paid').length || 0

  return {
    totalRevenue,
    totalEvents,
    totalTickets,
    ticketsSold,
    conversionRate: totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0,
  }
}

