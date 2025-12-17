import { createServiceRoleClient } from '@/lib/supabase/server'
import { TICKET_RULE_TYPES } from '@/lib/utils/constants'

export interface TicketUsageRule {
  id: string
  ticketTypeId: string
  ruleType: string
  ruleConfig: Record<string, any>
  priority: number
  isActive: boolean
}

export interface EventData {
  id: string
  startDate: string
  endDate: string
  isMultiDay: boolean
  organizationId?: string
}

export interface RuleEvaluationResult {
  isValid: boolean
  reason?: string
  ruleId?: string
  ruleType?: string
}

/**
 * Get all active usage rules for a ticket type, ordered by priority
 */
export async function getTicketUsageRules(
  ticketTypeId: string
): Promise<TicketUsageRule[]> {
  const supabase = await createServiceRoleClient()

  const { data: rules, error } = await supabase
    .from('ticket_usage_rules')
    .select('*')
    .eq('ticket_type_id', ticketTypeId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (error) {
    console.error('Error fetching ticket usage rules:', error)
    return []
  }

  return (rules || []).map((rule) => ({
    id: rule.id,
    ticketTypeId: rule.ticket_type_id,
    ruleType: rule.rule_type,
    ruleConfig: rule.rule_config as Record<string, any>,
    priority: rule.priority,
    isActive: rule.is_active,
  }))
}

/**
 * Evaluate all usage rules for a ticket at a given scan time
 */
export async function evaluateUsageRules(
  ticketId: string,
  scanTime: Date,
  event: EventData,
  ticketTypeId: string,
  scanCount: number,
  maxScans?: number | null,
  isMultiScan?: boolean
): Promise<RuleEvaluationResult> {
  const rules = await getTicketUsageRules(ticketTypeId)

  // If no rules, check basic multi-scan limits
  if (rules.length === 0) {
    if (!isMultiScan && scanCount > 0) {
      return {
        isValid: false,
        reason: 'Ticket has already been scanned (single-use ticket)',
      }
    }
    if (maxScans && scanCount >= maxScans) {
      return {
        isValid: false,
        reason: `Ticket has reached maximum scan limit (${maxScans})`,
      }
    }
    return { isValid: true }
  }

  // Evaluate rules by priority (higher priority first)
  for (const rule of rules) {
    const result = await evaluateRule(rule, scanTime, event, scanCount, maxScans, isMultiScan)
    if (!result.isValid) {
      return {
        ...result,
        ruleId: rule.id,
        ruleType: rule.ruleType,
      }
    }
  }

  return { isValid: true }
}

/**
 * Evaluate a single usage rule
 */
async function evaluateRule(
  rule: TicketUsageRule,
  scanTime: Date,
  event: EventData,
  scanCount: number,
  maxScans?: number | null,
  isMultiScan?: boolean
): Promise<RuleEvaluationResult> {
  switch (rule.ruleType) {
    case TICKET_RULE_TYPES.SCAN_LIMIT:
      return evaluateScanLimit(rule, scanCount, maxScans, isMultiScan)

    case TICKET_RULE_TYPES.TIME_WINDOW:
      return evaluateTimeWindow(rule, scanTime)

    case TICKET_RULE_TYPES.MULTI_DAY_ACCESS:
      return evaluateMultiDayAccess(rule, scanTime, event)

    case TICKET_RULE_TYPES.DATE_RANGE:
      return evaluateDateRange(rule, scanTime)

    case TICKET_RULE_TYPES.ZONE_RESTRICTION:
      // Zone restriction is typically validated at scan time with location data
      // This is a placeholder - actual implementation would check scan location
      return { isValid: true }

    default:
      console.warn(`Unknown rule type: ${rule.ruleType}`)
      return { isValid: true } // Unknown rules don't block
  }
}

/**
 * Evaluate scan limit rule
 */
function evaluateScanLimit(
  rule: TicketUsageRule,
  scanCount: number,
  maxScans?: number | null,
  isMultiScan?: boolean
): RuleEvaluationResult {
  const config = rule.ruleConfig
  const limit = config.maxScans ?? maxScans

  // If not multi-scan and already scanned, reject
  if (!isMultiScan && scanCount > 0) {
    return {
      isValid: false,
      reason: 'Ticket has already been scanned (single-use ticket)',
    }
  }

  // Check against limit
  if (limit && scanCount >= limit) {
    return {
      isValid: false,
      reason: `Ticket has reached maximum scan limit (${limit})`,
    }
  }

  return { isValid: true }
}

/**
 * Evaluate time window rule
 * Config format: { startTime: "HH:mm", endTime: "HH:mm", timezone?: string }
 */
function evaluateTimeWindow(
  rule: TicketUsageRule,
  scanTime: Date
): RuleEvaluationResult {
  const config = rule.ruleConfig
  const { startTime, endTime, timezone } = config

  if (!startTime || !endTime) {
    return { isValid: true } // Invalid config, don't block
  }

  // Parse time strings (HH:mm format)
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  const scanDate = new Date(scanTime)
  const scanHour = scanDate.getHours()
  const scanMinute = scanDate.getMinutes()
  const scanMinutes = scanHour * 60 + scanMinute
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  // Handle time windows that span midnight
  let isValid = false
  if (startMinutes <= endMinutes) {
    // Normal window (e.g., 10:00 - 14:00)
    isValid = scanMinutes >= startMinutes && scanMinutes <= endMinutes
  } else {
    // Window spans midnight (e.g., 22:00 - 02:00)
    isValid = scanMinutes >= startMinutes || scanMinutes <= endMinutes
  }

  if (!isValid) {
    return {
      isValid: false,
      reason: `Ticket is only valid between ${startTime} and ${endTime}`,
    }
  }

  return { isValid: true }
}

/**
 * Evaluate multi-day access rule
 * Config format: { allowedDays: [0, 1, 2] } where 0 = Sunday, 1 = Monday, etc.
 * OR { allowedDates: ["2024-01-15", "2024-01-16"] } for specific dates
 */
function evaluateMultiDayAccess(
  rule: TicketUsageRule,
  scanTime: Date,
  event: EventData
): RuleEvaluationResult {
  const config = rule.ruleConfig

  // If event is not multi-day, this rule doesn't apply
  if (!event.isMultiDay) {
    return { isValid: true }
  }

  // Check allowed days of week
  if (config.allowedDays && Array.isArray(config.allowedDays)) {
    const scanDay = scanTime.getDay()
    if (!config.allowedDays.includes(scanDay)) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const allowedDayNames = config.allowedDays.map((d: number) => dayNames[d]).join(', ')
      return {
        isValid: false,
        reason: `Ticket is only valid on: ${allowedDayNames}`,
      }
    }
  }

  // Check allowed specific dates
  if (config.allowedDates && Array.isArray(config.allowedDates)) {
    const scanDateStr = scanTime.toISOString().split('T')[0]
    if (!config.allowedDates.includes(scanDateStr)) {
      return {
        isValid: false,
        reason: `Ticket is not valid on this date. Valid dates: ${config.allowedDates.join(', ')}`,
      }
    }
  }

  // If no restrictions specified, allow all days (default behavior)
  return { isValid: true }
}

/**
 * Evaluate date range rule
 * Config format: { startDate: "2024-01-15", endDate: "2024-01-20" }
 */
function evaluateDateRange(
  rule: TicketUsageRule,
  scanTime: Date
): RuleEvaluationResult {
  const config = rule.ruleConfig
  const { startDate, endDate } = config

  if (!startDate || !endDate) {
    return { isValid: true } // Invalid config, don't block
  }

  const scanDateStr = scanTime.toISOString().split('T')[0]
  const start = new Date(startDate)
  const end = new Date(endDate)
  const scan = new Date(scanDateStr)

  if (scan < start || scan > end) {
    return {
      isValid: false,
      reason: `Ticket is only valid between ${startDate} and ${endDate}`,
    }
  }

  return { isValid: true }
}

/**
 * Validate that scan time is within event time range
 */
export function validateEventTimeRange(
  scanTime: Date,
  event: EventData
): RuleEvaluationResult {
  const scan = new Date(scanTime)
  const eventStart = new Date(event.startDate)
  const eventEnd = new Date(event.endDate)

  // Allow scans slightly before event start (e.g., 1 hour early for entry)
  const earlyAccessMinutes = 60 // 1 hour
  const adjustedStart = new Date(eventStart.getTime() - earlyAccessMinutes * 60 * 1000)

  if (scan < adjustedStart) {
    return {
      isValid: false,
      reason: 'Event has not started yet',
    }
  }

  // Allow scans slightly after event end (e.g., for exit scans)
  const lateAccessMinutes = 30 // 30 minutes
  const adjustedEnd = new Date(eventEnd.getTime() + lateAccessMinutes * 60 * 1000)

  if (scan > adjustedEnd) {
    return {
      isValid: false,
      reason: 'Event has ended',
    }
  }

  return { isValid: true }
}

