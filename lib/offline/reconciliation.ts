import { getPendingScans, type QueuedScan } from './queue'
import { checkConflicts, resolveConflicts } from './conflict-resolution'
import { syncPendingScans, SyncSummary } from './sync'

/**
 * Reconcile pending scans with server state
 * This ensures consistency between offline queue and server
 */
export async function reconcilePendingScans(): Promise<{
  reconciled: number
  conflicts: number
  errors: number
  details: Array<{
    scanId: string
    action: 'synced' | 'rejected' | 'error'
    reason: string
  }>
}> {
  const pendingScans = await getPendingScans()

  if (pendingScans.length === 0) {
    return {
      reconciled: 0,
      conflicts: 0,
      errors: 0,
      details: [],
    }
  }

  // Check conflicts for all pending scans
  const conflictResults = await resolveConflicts(pendingScans)

  const details: Array<{
    scanId: string
    action: 'synced' | 'rejected' | 'error'
    reason: string
  }> = []

  let conflicts = 0
  let errors = 0

  // Process each scan based on conflict check
  for (const scan of pendingScans) {
    const conflictCheck = conflictResults.get(scan.id)

    if (!conflictCheck) {
      errors++
      details.push({
        scanId: scan.id,
        action: 'error',
        reason: 'Conflict check failed',
      })
      continue
    }

    if (conflictCheck.hasConflict && conflictCheck.resolution) {
      if (conflictCheck.resolution.action === 'reject') {
        conflicts++
        details.push({
          scanId: scan.id,
          action: 'rejected',
          reason: conflictCheck.resolution.reason,
        })
        // Mark as failed
        const { markScanAsFailed } = await import('./queue')
        await markScanAsFailed(scan.id, conflictCheck.resolution.reason)
      }
    }
  }

  // Sync remaining valid scans
  const syncResult = await syncPendingScans()
  const reconciled = syncResult.successful

  // Add sync results to details
  for (const result of syncResult.results) {
    if (result.success) {
      details.push({
        scanId: result.scanId,
        action: 'synced',
        reason: result.message,
      })
    } else {
      errors++
      details.push({
        scanId: result.scanId,
        action: 'error',
        reason: result.error || result.message,
      })
    }
  }

  return {
    reconciled,
    conflicts,
    errors,
    details,
  }
}

/**
 * Verify server state for a specific scan
 */
export async function verifyServerState(scan: QueuedScan): Promise<{
  isValid: boolean
  reason: string
  serverData?: {
    ticketStatus: string
    alreadyScanned: boolean
    scanCount: number
  }
}> {
  const conflictCheck = await checkConflicts(scan)

  if (conflictCheck.hasConflict && conflictCheck.resolution) {
    return {
      isValid: false,
      reason: conflictCheck.resolution.reason,
      serverData: conflictCheck.serverState,
    }
  }

  return {
    isValid: true,
    reason: 'No conflicts detected',
    serverData: conflictCheck.serverState,
  }
}

/**
 * Batch reconciliation (for admin/sync operations)
 */
export async function batchReconcile(): Promise<SyncSummary> {
  // First, check all conflicts
  const pendingScans = await getPendingScans()
  const conflictResults = await resolveConflicts(pendingScans)

  // Mark conflicting scans as failed
  for (const [scanId, result] of conflictResults.entries()) {
    if (result.hasConflict && result.resolution?.action === 'reject') {
      const { markScanAsFailed } = await import('./queue')
      const scan = pendingScans.find((s) => s.id === scanId)
      if (scan) {
        await markScanAsFailed(scanId, result.resolution.reason)
      }
    }
  }

  // Then sync remaining valid scans
  return await syncPendingScans()
}

