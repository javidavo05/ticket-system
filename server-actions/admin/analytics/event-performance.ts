'use server'

import { requireRole } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'
import { getEventPerformance, getEventComparison, getEventSalesTrend } from '@/lib/services/analytics/event-performance'
import { canViewEventAnalytics } from '@/lib/auth/permissions'

/**
 * Get event performance metrics
 */
export async function getEventPerformanceAction(
  eventId: string,
  dateRange?: { start: string; end: string }
) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getEventPerformance(eventId, dateRange)
}

/**
 * Compare multiple events
 */
export async function getEventComparisonAction(
  eventIds: string[],
  dateRange?: { start: string; end: string }
) {
  await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING])

  return await getEventComparison(eventIds, dateRange)
}

/**
 * Get sales trend for an event
 */
export async function getEventSalesTrendAction(
  eventId: string,
  granularity: 'day' | 'week' | 'month' = 'day'
) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getEventSalesTrend(eventId, granularity)
}

