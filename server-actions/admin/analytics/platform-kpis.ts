'use server'

import { requireRole } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'
import { getPlatformKPIs, getPlatformGrowthMetrics, getUserActivityMetrics } from '@/lib/services/analytics/platform-kpis'

/**
 * Get platform KPIs
 */
export async function getPlatformKPIsAction(dateRange?: { start: string; end: string }) {
  await requireRole(ROLES.ACCOUNTING)

  return await getPlatformKPIs(dateRange)
}

/**
 * Get platform growth metrics
 */
export async function getPlatformGrowthMetricsAction(periods: number = 12) {
  await requireRole(ROLES.ACCOUNTING)

  return await getPlatformGrowthMetrics(periods)
}

/**
 * Get user activity metrics
 */
export async function getUserActivityMetricsAction(dateRange?: { start: string; end: string }) {
  await requireRole(ROLES.ACCOUNTING)

  return await getUserActivityMetrics(dateRange)
}

