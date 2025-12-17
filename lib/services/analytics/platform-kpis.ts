import { getReadReplicaClient } from './query-optimization'

export interface PlatformKPIs {
  totalActiveEvents: number
  totalTicketsSold: number
  totalRevenue: number
  activeUsers: number
  growthRate: {
    events: number
    tickets: number
    revenue: number
    users: number
  }
}

export interface PlatformGrowthMetrics {
  periods: Array<{
    period: string
    events: number
    ticketsSold: number
    revenue: number
    newUsers: number
  }>
  growthRates: {
    events: number
    tickets: number
    revenue: number
    users: number
  }
}

export interface UserActivityMetrics {
  activeUsers: number
  newUsers: number
  returningUsers: number
  retentionRate: number
  activityByRole: Array<{
    role: string
    count: number
  }>
}

/**
 * Get comprehensive platform KPIs
 */
export async function getPlatformKPIs(dateRange?: { start: string; end: string }): Promise<PlatformKPIs> {
  const supabase = await getReadReplicaClient()

  // Active events
  let eventsQuery = supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .in('status', ['published', 'live'])
    .is('deleted_at', null)

  if (dateRange) {
    eventsQuery = eventsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { count: totalActiveEvents } = await eventsQuery

  // Tickets sold
  let ticketsQuery = supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .in('status', ['paid', 'used'])

  if (dateRange) {
    ticketsQuery = ticketsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { count: totalTicketsSold } = await ticketsQuery

  // Total revenue
  let paymentsQuery = supabase
    .from('payments')
    .select('amount, amount_paid, status')
    .eq('status', 'completed')

  if (dateRange) {
    paymentsQuery = paymentsQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { data: payments } = await paymentsQuery

  const totalRevenue = (payments || []).reduce((sum, p) => {
    return sum + parseFloat((p.amount_paid || p.amount || '0') as string)
  }, 0)

  // Active users (users who made purchases or logged in)
  let usersQuery = supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (dateRange) {
    usersQuery = usersQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { count: activeUsers } = await usersQuery

  // Calculate growth rates (compare with previous period)
  let previousPeriod: { start: string; end: string } | undefined
  if (dateRange) {
    const periodDuration = new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()
    const previousStart = new Date(new Date(dateRange.start).getTime() - periodDuration)
    previousPeriod = {
      start: previousStart.toISOString(),
      end: dateRange.start,
    }
  }

  const previousKPIs = previousPeriod ? await getPlatformKPIs(previousPeriod) : null

  const growthRate = {
    events: previousKPIs && previousKPIs.totalActiveEvents > 0
      ? ((totalActiveEvents - previousKPIs.totalActiveEvents) / previousKPIs.totalActiveEvents) * 100
      : 0,
    tickets: previousKPIs && previousKPIs.totalTicketsSold > 0
      ? ((totalTicketsSold - previousKPIs.totalTicketsSold) / previousKPIs.totalTicketsSold) * 100
      : 0,
    revenue: previousKPIs && previousKPIs.totalRevenue > 0
      ? ((totalRevenue - previousKPIs.totalRevenue) / previousKPIs.totalRevenue) * 100
      : 0,
    users: previousKPIs && previousKPIs.activeUsers > 0
      ? ((activeUsers - previousKPIs.activeUsers) / previousKPIs.activeUsers) * 100
      : 0,
  }

  return {
    totalActiveEvents: totalActiveEvents || 0,
    totalTicketsSold: totalTicketsSold || 0,
    totalRevenue,
    activeUsers: activeUsers || 0,
    growthRate,
  }
}

/**
 * Get platform growth metrics over multiple periods
 */
export async function getPlatformGrowthMetrics(periods: number = 12): Promise<PlatformGrowthMetrics> {
  const supabase = await getReadReplicaClient()

  const now = new Date()
  const periodData: Array<{
    period: string
    events: number
    ticketsSold: number
    revenue: number
    newUsers: number
  }> = []

  for (let i = periods - 1; i >= 0; i--) {
    const periodStart = new Date(now)
    periodStart.setMonth(periodStart.getMonth() - i)
    periodStart.setDate(1)
    periodStart.setHours(0, 0, 0, 0)

    const periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)
    periodEnd.setDate(0)
    periodEnd.setHours(23, 59, 59, 999)

    const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`
    const dateRange = {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    }

    // Get metrics for this period
    const { count: events } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .is('deleted_at', null)

    const { count: ticketsSold } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .in('status', ['paid', 'used'])

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, amount_paid')
      .eq('status', 'completed')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)

    const revenue = (payments || []).reduce((sum, p) => {
      return sum + parseFloat((p.amount_paid || p.amount || '0') as string)
    }, 0)

    const { count: newUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end)
      .is('deleted_at', null)

    periodData.push({
      period,
      events: events || 0,
      ticketsSold: ticketsSold || 0,
      revenue,
      newUsers: newUsers || 0,
    })
  }

  // Calculate growth rates (comparing first and last period)
  const firstPeriod = periodData[0]
  const lastPeriod = periodData[periodData.length - 1]

  const growthRates = {
    events:
      firstPeriod && firstPeriod.events > 0
        ? ((lastPeriod.events - firstPeriod.events) / firstPeriod.events) * 100
        : 0,
    tickets:
      firstPeriod && firstPeriod.ticketsSold > 0
        ? ((lastPeriod.ticketsSold - firstPeriod.ticketsSold) / firstPeriod.ticketsSold) * 100
        : 0,
    revenue:
      firstPeriod && firstPeriod.revenue > 0
        ? ((lastPeriod.revenue - firstPeriod.revenue) / firstPeriod.revenue) * 100
        : 0,
    users:
      firstPeriod && firstPeriod.newUsers > 0
        ? ((lastPeriod.newUsers - firstPeriod.newUsers) / firstPeriod.newUsers) * 100
        : 0,
  }

  return {
    periods: periodData,
    growthRates,
  }
}

/**
 * Get user activity metrics
 */
export async function getUserActivityMetrics(dateRange?: { start: string; end: string }): Promise<UserActivityMetrics> {
  const supabase = await getReadReplicaClient()

  // Active users (users with activity in period)
  let activeUsersQuery = supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (dateRange) {
    activeUsersQuery = activeUsersQuery
      .or(`created_at.gte.${dateRange.start},updated_at.gte.${dateRange.start}`)
      .or(`created_at.lte.${dateRange.end},updated_at.lte.${dateRange.end}`)
  }

  const { count: activeUsers } = await activeUsersQuery

  // New users
  let newUsersQuery = supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)

  if (dateRange) {
    newUsersQuery = newUsersQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  } else {
    // Last 30 days if no range
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    newUsersQuery = newUsersQuery.gte('created_at', thirtyDaysAgo.toISOString())
  }

  const { count: newUsers } = await newUsersQuery

  // Returning users (users who made purchases in period)
  let returningUsersQuery = supabase
    .from('tickets')
    .select('purchaser_id')
    .not('purchaser_id', 'is', null)

  if (dateRange) {
    returningUsersQuery = returningUsersQuery.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  }

  const { data: tickets } = await returningUsersQuery
  const uniquePurchasers = new Set((tickets || []).map((t) => t.purchaser_id).filter(Boolean))
  const returningUsers = uniquePurchasers.size

  // Retention rate (simplified - users who made purchases vs new users)
  const retentionRate = newUsers > 0 ? (returningUsers / newUsers) * 100 : 0

  // Activity by role
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role, user_id')
    .is('event_id', null) // Global roles only

  const activityByRoleMap = new Map<string, number>()
  userRoles?.forEach((ur) => {
    activityByRoleMap.set(ur.role, (activityByRoleMap.get(ur.role) || 0) + 1)
  })

  const activityByRole = Array.from(activityByRoleMap.entries())
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count)

  return {
    activeUsers: activeUsers || 0,
    newUsers: newUsers || 0,
    returningUsers,
    retentionRate,
    activityByRole,
  }
}

