import { openDB, DBSchema, IDBPDatabase } from 'idb'

export interface QueuedScan {
  id: string // UUID generado localmente
  qrSignature: string
  scannerId: string
  location?: { lat: number; lng: number }
  timestamp: string
  attempts: number
  lastAttempt?: string
  status: 'pending' | 'processing' | 'failed' | 'synced'
  error?: string
  ticketId?: string // Para deduplicación
}

interface ScannerDB extends DBSchema {
  scans: {
    key: string
    value: QueuedScan
    indexes: { 'by-status': string; 'by-timestamp': string; 'by-ticket': string }
  }
}

const DB_NAME = 'ticket-scanner-db'
const DB_VERSION = 1
const STORE_NAME = 'scans'
const MAX_QUEUE_SIZE = 1000 // Límite de escaneos en cola

let dbInstance: IDBPDatabase<ScannerDB> | null = null

/**
 * Initialize IndexedDB database
 */
export async function initQueue(): Promise<IDBPDatabase<ScannerDB>> {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await openDB<ScannerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, {
        keyPath: 'id',
      })

      // Indexes for efficient queries
      store.createIndex('by-status', 'status')
      store.createIndex('by-timestamp', 'timestamp')
      store.createIndex('by-ticket', 'ticketId', { unique: false })
    },
  })

  return dbInstance
}

/**
 * Generate unique ID for queued scan
 */
function generateScanId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Add scan to offline queue
 */
export async function addScanToQueue(scanData: {
  qrSignature: string
  scannerId: string
  location?: { lat: number; lng: number }
  ticketId?: string
}): Promise<string> {
  const db = await initQueue()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.store

  // Check queue size and remove oldest if needed
  const count = await store.count()
  if (count >= MAX_QUEUE_SIZE) {
    // Get oldest pending scan
    const index = store.index('by-timestamp')
    const oldest = await index.getAll()
    if (oldest.length > 0) {
      const sorted = oldest.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      await store.delete(sorted[0].id)
    }
  }

  // Check for duplicate ticket (if ticketId provided)
  if (scanData.ticketId) {
    const ticketIndex = store.index('by-ticket')
    const existing = await ticketIndex.getAll(scanData.ticketId)
    const pending = existing.filter((s) => s.status === 'pending' || s.status === 'processing')
    if (pending.length > 0) {
      // Return existing scan ID
      return pending[0].id
    }
  }

  const scanId = generateScanId()
  const queuedScan: QueuedScan = {
    id: scanId,
    qrSignature: scanData.qrSignature,
    scannerId: scanData.scannerId,
    location: scanData.location,
    ticketId: scanData.ticketId,
    timestamp: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  }

  await store.add(queuedScan)
  await tx.done

  return scanId
}

/**
 * Get all pending scans
 */
export async function getPendingScans(): Promise<QueuedScan[]> {
  const db = await initQueue()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.store
  const index = store.index('by-status')

  const pending = await index.getAll('pending')
  const processing = await index.getAll('processing')
  const failed = await index.getAll('failed')

  return [...pending, ...processing, ...failed].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  )
}

/**
 * Get scan by ID
 */
export async function getScanById(scanId: string): Promise<QueuedScan | undefined> {
  const db = await initQueue()
  return await db.get(STORE_NAME, scanId)
}

/**
 * Update scan status
 */
export async function updateScanStatus(
  scanId: string,
  status: QueuedScan['status'],
  error?: string
): Promise<void> {
  const db = await initQueue()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.store

  const scan = await store.get(scanId)
  if (!scan) {
    return
  }

  scan.status = status
  scan.attempts += 1
  scan.lastAttempt = new Date().toISOString()
  if (error) {
    scan.error = error
  }

  await store.put(scan)
  await tx.done
}

/**
 * Remove scan from queue (after successful sync)
 */
export async function removeScanFromQueue(scanId: string): Promise<void> {
  const db = await initQueue()
  await db.delete(STORE_NAME, scanId)
}

/**
 * Clear all scans from queue (admin function)
 */
export async function clearQueue(): Promise<void> {
  const db = await initQueue()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.store
  await store.clear()
  await tx.done
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number
  pending: number
  processing: number
  failed: number
  synced: number
}> {
  const db = await initQueue()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.store
  const index = store.index('by-status')

  const [pending, processing, failed, synced] = await Promise.all([
    index.count('pending'),
    index.count('processing'),
    index.count('failed'),
    index.count('synced'),
  ])

  return {
    total: pending + processing + failed + synced,
    pending,
    processing,
    failed,
    synced,
  }
}

/**
 * Mark scan as synced
 */
export async function markScanAsSynced(scanId: string): Promise<void> {
  await updateScanStatus(scanId, 'synced')
}

/**
 * Mark scan as failed
 */
export async function markScanAsFailed(scanId: string, error: string): Promise<void> {
  await updateScanStatus(scanId, 'failed', error)
}

