import {
  getPendingScans,
  updateScanStatus,
  markScanAsSynced,
  markScanAsFailed,
  removeScanFromQueue,
  type QueuedScan,
} from './queue'

export interface SyncResult {
  scanId: string
  success: boolean
  message: string
  error?: string
}

export interface SyncSummary {
  total: number
  successful: number
  failed: number
  conflicts: number
  results: SyncResult[]
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true // Server-side, assume online
  }
  return navigator.onLine
}

/**
 * Listen for online/offline events
 */
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {} // No-op on server
  }

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Deduplicate scans by ticket ID (client-side only)
 * If multiple scans exist for the same ticket, keep only the first one
 */
function deduplicateScans(scans: QueuedScan[]): QueuedScan[] {
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

/**
 * Sync a single scan to server
 */
async function syncSingleScan(scan: QueuedScan): Promise<SyncResult> {
  try {
    // Update status to processing
    await updateScanStatus(scan.id, 'processing')

    // Call API to process scan
    // Conflict checking is handled server-side in the API endpoint
    const response = await fetch('/api/scanner/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qrSignature: scan.qrSignature,
        scannerId: scan.scannerId,
        location: scan.location,
        scanId: scan.id, // Include local scan ID for tracking
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      await markScanAsFailed(scan.id, errorData.message || 'Sync failed')
      return {
        scanId: scan.id,
        success: false,
        message: errorData.message || 'Sync failed',
        error: errorData.message || 'Sync failed',
      }
    }

    const result = await response.json()

    if (result.success) {
      // Mark as synced and remove from queue
      await markScanAsSynced(scan.id)
      // Optionally remove after a delay to allow user to see sync status
      setTimeout(() => {
        removeScanFromQueue(scan.id).catch(() => {
          // Ignore errors
        })
      }, 5000) // Remove after 5 seconds

      return {
        scanId: scan.id,
        success: true,
        message: result.message || 'Scan synced successfully',
      }
    } else {
      await markScanAsFailed(scan.id, result.message || 'Validation failed')
      return {
        scanId: scan.id,
        success: false,
        message: result.message || 'Validation failed',
        error: result.message || 'Validation failed',
      }
    }
  } catch (error: any) {
    await markScanAsFailed(scan.id, error.message || 'Network error')
    return {
      scanId: scan.id,
      success: false,
      message: error.message || 'Network error',
      error: error.message || 'Network error',
    }
  }
}

/**
 * Sync all pending scans
 */
export async function syncPendingScans(): Promise<SyncSummary> {
  if (!isOnline()) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      conflicts: 0,
      results: [],
    }
  }

  const pendingScans = await getPendingScans()

  if (pendingScans.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      conflicts: 0,
      results: [],
    }
  }

  // Deduplicate scans by ticket ID
  const deduplicated = deduplicateScans(pendingScans)

  // Process scans sequentially to avoid overwhelming the server
  const results: SyncResult[] = []
  let successful = 0
  let failed = 0
  let conflicts = 0

  for (const scan of deduplicated) {
    const result = await syncSingleScan(scan)
    results.push(result)

    if (result.success) {
      successful++
    } else {
      failed++
      if (result.error?.includes('already') || result.error?.includes('conflict')) {
        conflicts++
      }
    }

    // Small delay between scans to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return {
    total: deduplicated.length,
    successful,
    failed,
    conflicts,
    results,
  }
}

/**
 * Process queue when device comes online
 */
export async function processQueue(): Promise<SyncSummary> {
  if (!isOnline()) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      conflicts: 0,
      results: [],
    }
  }

  return await syncPendingScans()
}

/**
 * Retry failed scans
 */
export async function retryFailedScans(): Promise<SyncSummary> {
  const pendingScans = await getPendingScans()
  const failedScans = pendingScans.filter((s) => s.status === 'failed' && s.attempts < 5)

  if (failedScans.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      conflicts: 0,
      results: [],
    }
  }

  // Reset status to pending for retry
  for (const scan of failedScans) {
    await updateScanStatus(scan.id, 'pending')
  }

  return await syncPendingScans()
}

/**
 * Auto-sync when online (call this on app initialization)
 */
export function setupAutoSync(onSyncComplete?: (summary: SyncSummary) => void): () => void {
  let syncInProgress = false

  const performSync = async () => {
    if (syncInProgress || !isOnline()) {
      return
    }

    syncInProgress = true
    try {
      const summary = await syncPendingScans()
      if (onSyncComplete) {
        onSyncComplete(summary)
      }
    } catch (error) {
      console.error('Auto-sync error:', error)
    } finally {
      syncInProgress = false
    }
  }

  // Sync immediately if online
  if (isOnline()) {
    performSync()
  }

  // Listen for online events
  const unsubscribe = onOnlineStatusChange((online) => {
    if (online) {
      performSync()
    }
  })

  // Periodic sync (every 30 seconds when online)
  const interval = setInterval(() => {
    if (isOnline() && !syncInProgress) {
      performSync()
    }
  }, 30000)

  return () => {
    unsubscribe()
    clearInterval(interval)
  }
}

