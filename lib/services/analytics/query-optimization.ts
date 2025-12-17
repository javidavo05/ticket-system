import { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Helper to use read replica when available
 * For now, returns the primary client
 * In production, this would check for read replica availability
 */
export async function getReadReplicaClient(): Promise<SupabaseClient> {
  // TODO: In production, check for read replica availability
  // For now, return primary client
  // Example: return process.env.READ_REPLICA_URL ? createReadReplicaClient() : createServiceRoleClient()
  return await createServiceRoleClient()
}

/**
 * Cache key generator for analytics queries
 */
export function getCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join('|')
  return `analytics:${prefix}:${sortedParams}`
}

/**
 * Build optimized analytics query with filters
 */
export function buildAnalyticsQuery<T>(
  baseQuery: any,
  filters: {
    dateRange?: { start: string; end: string }
    organizationId?: string
    eventId?: string
    status?: string | string[]
    [key: string]: any
  }
): any {
  let query = baseQuery

  // Date range filter
  if (filters.dateRange) {
    query = query.gte('created_at', filters.dateRange.start).lte('created_at', filters.dateRange.end)
  }

  // Organization filter
  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId)
  }

  // Event filter
  if (filters.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  // Status filter
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }

  return query
}

/**
 * Execute query with error handling
 */
export async function executeAnalyticsQuery<T>(
  queryPromise: Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await queryPromise

  if (error) {
    throw new Error(`Analytics query failed: ${error.message}`)
  }

  if (!data) {
    return [] as T
  }

  return data
}

