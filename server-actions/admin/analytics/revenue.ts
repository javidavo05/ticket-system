'use server'

import { requireRole } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'
import {
  getEventRevenue,
  getRevenueBreakdown,
  getEventProfitability,
  getPlatformRevenue,
} from '@/lib/services/analytics/revenue'
import { canViewEventAnalytics } from '@/lib/auth/permissions'

/**
 * Get event revenue metrics
 */
export async function getEventRevenueAction(
  eventId: string,
  dateRange?: { start: string; end: string }
) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getEventRevenue(eventId, dateRange)
}

/**
 * Get detailed revenue breakdown
 */
export async function getRevenueBreakdownAction(eventId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getRevenueBreakdown(eventId)
}

/**
 * Get event profitability
 */
export async function getEventProfitabilityAction(eventId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getEventProfitability(eventId)
}

/**
 * Get platform-wide revenue
 */
export async function getPlatformRevenueAction(dateRange?: { start: string; end: string }) {
  await requireRole(ROLES.ACCOUNTING)

  return await getPlatformRevenue(dateRange)
}

