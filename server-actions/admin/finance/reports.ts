'use server'

import { requireSuperAdmin, requireRole } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getEventAnalytics } from '@/lib/services/events/analytics'
import { ROLES } from '@/lib/utils/constants'

export async function getEventRevenue(eventId: string, dateRange?: { start: string; end: string }) {
  await requireRole(ROLES.ACCOUNTING)

  const analytics = await getEventAnalytics(eventId)
  return analytics
}

export async function getPlatformKPIs(dateRange?: { start: string; end: string }) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server-actions/admin/finance/reports.ts:15',message:'getPlatformKPIs entry',data:{hasDateRange:!!dateRange},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  // Super admin has access to all admin functions
  // requireRole already allows super_admin, so we can use it directly
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server-actions/admin/finance/reports.ts:20',message:'Calling requireRole',data:{role:ROLES.ACCOUNTING},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    await requireRole(ROLES.ACCOUNTING)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server-actions/admin/finance/reports.ts:22',message:'requireRole passed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server-actions/admin/finance/reports.ts:25',message:'requireRole failed',data:{errorMessage:error?.message,errorName:error?.name,errorStatus:error?.statusCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    throw error
  }

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

  const { data: paymentsData } = await paymentsQuery

  const payments = (paymentsData || []) as Array<{
    amount: string | number
    status: string
    created_at: string
  }>

  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount as string), 0)

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

  const { data: ticketsData } = await ticketsQuery
  const tickets = (ticketsData || []) as Array<{
    id: string
    status: string
  }>
  const totalTickets = tickets.length
  const ticketsSold = tickets.filter(t => t.status === 'paid').length

  return {
    totalRevenue,
    totalEvents,
    totalTickets,
    ticketsSold,
    conversionRate: totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0,
  }
}

