import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface AuditLogData {
  userId?: string
  action: string
  resourceType: string
  resourceId: string
  changes?: Record<string, { before: unknown; after: unknown }>
  metadata?: Record<string, unknown>
}

export async function logAuditEvent(
  data: AuditLogData,
  request?: NextRequest
): Promise<void> {
  const supabase = await createServiceRoleClient()

  const ipAddress = request?.ip || request?.headers.get('x-forwarded-for') || null
  const userAgent = request?.headers.get('user-agent') || null

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: data.userId || null,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      changes: data.changes || null,
      metadata: data.metadata || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })

  if (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

