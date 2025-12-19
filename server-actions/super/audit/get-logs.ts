'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function getAuditLogs(filters?: {
  userId?: string
  action?: string
  resourceType?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  await requireSuperAdmin()

  const supabase = await createServiceRoleClient()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.resourceType) {
    query = query.eq('resource_type', filters.resourceType)
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data: logsData, error } = await query

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`)
  }

  const logs = (logsData || []) as Array<{
    id: string
    user_id: string | null
    action: string
    resource_type: string
    resource_id: string
    changes: any
    metadata: any
    ip_address: string | null
    user_agent: string | null
    created_at: string
    [key: string]: any
  }>

  return logs.map((log) => ({
    id: log.id,
    userId: log.user_id,
    action: log.action,
    resourceType: log.resource_type,
    resourceId: log.resource_id,
    changes: log.changes,
    metadata: log.metadata,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: new Date(log.created_at),
  }))
}
