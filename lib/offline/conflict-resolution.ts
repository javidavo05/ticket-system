import { QueuedScan } from './queue'
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface ConflictResolution {
  action: 'process' | 'reject' | 'merge'
  reason: string
  resolvedScan?: QueuedScan
}

export interface ConflictCheckResult {
  hasConflict: boolean
  resolution: ConflictResolution | null
  serverState?: {
    alreadyScanned: boolean
    ticketStatus: string
    scanCount: number
    nonceUsed: boolean
  }
}

/**
 * Check for conflicts before processing a queued scan
 */
export async function checkConflicts(scan: QueuedScan): Promise<ConflictCheckResult> {
  const supabase = await createServiceRoleClient()

  // Extract ticket ID from QR signature if possible
  // For now, we'll need to verify the QR signature to get ticket ID
  let ticketId: string | undefined = scan.ticketId

  // If we don't have ticketId, we can't check conflicts properly
  // The validation will handle invalid QR signatures
  // For now, we'll proceed with conflict check using the QR signature directly

  if (!ticketId) {
    return {
      hasConflict: false,
      resolution: null,
    }
  }

  // Check 1: Verify if ticket was already scanned (by this scanner or another)
  const { data: existingScans } = await (supabase
    .from('ticket_scans')
    .select('id, is_valid, created_at')
    .eq('ticket_id', ticketId)
    .eq('is_valid', true)
    .order('created_at', { ascending: false })
    .limit(1) as any)

  const alreadyScanned = ((existingScans as any)?.length || 0) > 0

  // Check 2: Verify ticket current status
  const { data: ticket } = await (supabase
    .from('tickets')
    .select('id, status, scan_count')
    .eq('id', ticketId)
    .single() as any)

  const ticketStatus = (ticket as any)?.status || 'unknown'
  const scanCount = (ticket as any)?.scan_count || 0
  const isRevoked = ticketStatus === 'revoked'
  const isRefunded = ticketStatus === 'refunded'

  // Check 3: Verify if nonce was already used
  // We'll check this during validation, but for now we'll skip detailed nonce check
  // The validation endpoint will handle nonce verification
  let nonceUsed = false
  // Note: Nonce verification requires parsing QR signature which is async
  // This will be handled during actual validation

  const serverState = {
    alreadyScanned,
    ticketStatus,
    scanCount,
    nonceUsed,
  }

  // Determine resolution based on conflicts
  if (nonceUsed) {
    return {
      hasConflict: true,
      resolution: {
        action: 'reject',
        reason: 'QR code nonce already used (replay attack)',
      },
      serverState,
    }
  }

  if (isRevoked) {
    return {
      hasConflict: true,
      resolution: {
        action: 'reject',
        reason: 'Ticket has been revoked',
      },
      serverState,
    }
  }

  if (isRefunded) {
    return {
      hasConflict: true,
      resolution: {
        action: 'reject',
        reason: 'Ticket has been refunded',
      },
      serverState,
    }
  }

  // If already scanned, check if it's a duplicate scan from offline queue
  if (alreadyScanned) {
    // Check if the scan was done after the queued scan timestamp
    const existingScan = (existingScans as any)?.[0]
    if (existingScan && new Date((existingScan as any).created_at) > new Date(scan.timestamp)) {
      return {
        hasConflict: true,
        resolution: {
          action: 'reject',
          reason: 'Ticket was already scanned by another device',
        },
        serverState,
      }
    }

    // If scan was done before queued scan, it might be a duplicate in queue
    // We'll let the validation handle it (it will check nonce)
  }

  // No conflicts detected
  return {
    hasConflict: false,
    resolution: null,
    serverState,
  }
}

/**
 * Resolve conflicts for multiple scans
 */
export async function resolveConflicts(scans: QueuedScan[]): Promise<Map<string, ConflictCheckResult>> {
  const results = new Map<string, ConflictCheckResult>()

  // Process scans sequentially to avoid race conditions
  for (const scan of scans) {
    const result = await checkConflicts(scan)
    results.set(scan.id, result)
  }

  return results
}

/**
 * Deduplicate scans by ticket ID
 * If multiple scans exist for the same ticket, keep only the first one
 */
export async function deduplicateScans(scans: QueuedScan[]): Promise<QueuedScan[]> {
  const ticketMap = new Map<string, QueuedScan>()

  for (const scan of scans) {
    if (!scan.ticketId) {
      // If no ticketId, we can't deduplicate - keep it
      continue
    }

    const existing = ticketMap.get(scan.ticketId)
    if (!existing) {
      ticketMap.set(scan.ticketId, scan)
    } else {
      // Keep the earliest scan
      if (new Date(scan.timestamp) < new Date(existing.timestamp)) {
        ticketMap.set(scan.ticketId, scan)
      }
    }
  }

  return Array.from(ticketMap.values())
}

