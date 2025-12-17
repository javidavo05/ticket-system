'use server'

import { requireRole } from '@/lib/auth/permissions'
import { ROLES } from '@/lib/utils/constants'
import { getEventAttendance, getAttendanceByTimeWindow, getAttendanceRate } from '@/lib/services/analytics/attendance'
import { canViewEventAnalytics } from '@/lib/auth/permissions'

/**
 * Get event attendance metrics
 */
export async function getEventAttendanceAction(eventId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SCANNER, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getEventAttendance(eventId)
}

/**
 * Get attendance by time window
 */
export async function getAttendanceByTimeWindowAction(
  eventId: string,
  windowSize: 'hour' | 'day' = 'hour'
) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SCANNER, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getAttendanceByTimeWindow(eventId, windowSize)
}

/**
 * Get attendance rate for an event
 */
export async function getAttendanceRateAction(eventId: string) {
  const user = await requireRole([ROLES.EVENT_ADMIN, ROLES.SCANNER, ROLES.ACCOUNTING])

  // Verify user can view analytics for this event
  if (!(await canViewEventAnalytics(user.id, eventId))) {
    throw new Error('No tienes permisos para ver analytics de este evento')
  }

  return await getAttendanceRate(eventId)
}

