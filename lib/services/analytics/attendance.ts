import { getReadReplicaClient } from './query-optimization'

export interface AttendanceMetrics {
  eventId: string
  totalTicketsSold: number
  totalTicketsScanned: number
  uniqueAttendees: number
  attendanceRate: number
  peakHours: Array<{
    hour: number
    scans: number
  }>
  scanDistribution: Array<{
    date: string
    scans: number
  }>
  reScanAnalysis: {
    totalReScans: number
    ticketsWithMultipleScans: number
    averageScansPerTicket: number
  }
}

/**
 * Get comprehensive attendance metrics for an event
 */
export async function getEventAttendance(eventId: string): Promise<AttendanceMetrics> {
  const supabase = await getReadReplicaClient()

  // Get tickets for event
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, status, scan_count, first_scan_at, last_scan_at')
    .eq('event_id', eventId)
    .in('status', ['paid', 'used'])

  if (ticketsError) {
    throw new Error(`Error fetching tickets: ${ticketsError.message}`)
  }

  const totalTicketsSold = tickets?.length || 0
  const totalTicketsScanned = (tickets || []).filter((t) => t.scan_count > 0).length

  // Get all scans for tickets in this event
  const ticketIds = (tickets || []).map((t) => t.id)
  let scansQuery = supabase.from('ticket_scans').select('id, ticket_id, created_at, is_valid').in('ticket_id', ticketIds)

  if (ticketIds.length === 0) {
    // No tickets, return empty result
    scansQuery = scansQuery.eq('ticket_id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: scans, error: scansError } = await scansQuery

  if (scansError) {
    throw new Error(`Error fetching scans: ${scansError.message}`)
  }

  const validScans = (scans || []).filter((s) => s.is_valid)
  const totalTicketsScannedCount = validScans.length

  // Count unique attendees (unique ticket IDs that were scanned)
  const uniqueAttendees = new Set(validScans.map((s) => s.ticket_id)).size

  // Peak hours analysis
  const scansByHour = new Map<number, number>()
  validScans.forEach((scan) => {
    const hour = new Date(scan.created_at).getHours()
    scansByHour.set(hour, (scansByHour.get(hour) || 0) + 1)
  })

  const peakHours = Array.from(scansByHour.entries())
    .map(([hour, scans]) => ({ hour, scans }))
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 10) // Top 10 hours

  // Scan distribution by date
  const scansByDate = new Map<string, number>()
  validScans.forEach((scan) => {
    const date = new Date(scan.created_at).toISOString().split('T')[0]
    scansByDate.set(date, (scansByDate.get(date) || 0) + 1)
  })

  const scanDistribution = Array.from(scansByDate.entries())
    .map(([date, scans]) => ({ date, scans }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Re-scan analysis
  const scansPerTicket = new Map<string, number>()
  validScans.forEach((scan) => {
    scansPerTicket.set(scan.ticket_id, (scansPerTicket.get(scan.ticket_id) || 0) + 1)
  })

  const ticketsWithMultipleScans = Array.from(scansPerTicket.values()).filter((count) => count > 1).length
  const totalReScans = Array.from(scansPerTicket.values())
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count - 1, 0) // Subtract 1 because first scan is not a re-scan
  const averageScansPerTicket =
    scansPerTicket.size > 0
      ? Array.from(scansPerTicket.values()).reduce((sum, count) => sum + count, 0) / scansPerTicket.size
      : 0

  return {
    eventId,
    totalTicketsSold,
    totalTicketsScanned: totalTicketsScannedCount,
    uniqueAttendees,
    attendanceRate: totalTicketsSold > 0 ? (totalTicketsScanned / totalTicketsSold) * 100 : 0,
    peakHours,
    scanDistribution,
    reScanAnalysis: {
      totalReScans,
      ticketsWithMultipleScans,
      averageScansPerTicket,
    },
  }
}

/**
 * Get attendance by time window
 */
export async function getAttendanceByTimeWindow(
  eventId: string,
  windowSize: 'hour' | 'day' = 'hour'
): Promise<Array<{ period: string; scans: number; uniqueTickets: number }>> {
  const supabase = await getReadReplicaClient()

  // Get tickets for event
  const { data: tickets } = await supabase.from('tickets').select('id').eq('event_id', eventId).in('status', ['paid', 'used'])

  const ticketIds = (tickets || []).map((t) => t.id)

  if (ticketIds.length === 0) {
    return []
  }

  // Get scans
  const { data: scans, error: scansError } = await supabase
    .from('ticket_scans')
    .select('id, ticket_id, created_at, is_valid')
    .in('ticket_id', ticketIds)
    .eq('is_valid', true)

  if (scansError) {
    throw new Error(`Error fetching scans: ${scansError.message}`)
  }

  const attendanceByPeriod = new Map<string, { scans: number; uniqueTickets: Set<string> }>()

  scans?.forEach((scan) => {
    const date = new Date(scan.created_at)
    let period: string

    if (windowSize === 'hour') {
      period = `${date.toISOString().split('T')[0]}T${String(date.getHours()).padStart(2, '0')}:00:00`
    } else {
      period = date.toISOString().split('T')[0]
    }

    const existing = attendanceByPeriod.get(period) || { scans: 0, uniqueTickets: new Set<string>() }
    existing.scans++
    existing.uniqueTickets.add(scan.ticket_id)
    attendanceByPeriod.set(period, existing)
  })

  return Array.from(attendanceByPeriod.entries())
    .map(([period, data]) => ({
      period,
      scans: data.scans,
      uniqueTickets: data.uniqueTickets.size,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

/**
 * Get attendance rate for an event
 */
export async function getAttendanceRate(eventId: string): Promise<{
  attendanceRate: number
  ticketsSold: number
  ticketsScanned: number
  comparison?: {
    averageRate: number
    percentile: number
  }
}> {
  const supabase = await getReadReplicaClient()

  // Get tickets
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, status, scan_count')
    .eq('event_id', eventId)
    .in('status', ['paid', 'used'])

  if (ticketsError) {
    throw new Error(`Error fetching tickets: ${ticketsError.message}`)
  }

  const ticketsSold = tickets?.length || 0
  const ticketsScanned = (tickets || []).filter((t) => t.scan_count > 0).length
  const attendanceRate = ticketsSold > 0 ? (ticketsScanned / ticketsSold) * 100 : 0

  // TODO: Get comparison data from similar events
  // This would require querying other events of similar type/size

  return {
    attendanceRate,
    ticketsSold,
    ticketsScanned,
  }
}

