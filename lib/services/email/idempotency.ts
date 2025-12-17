import { createServiceRoleClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

export interface EmailDelivery {
  id: string
  emailType: string
  recipientEmail: string
  recipientName?: string
  idempotencyKey: string
  status: 'pending' | 'sent' | 'failed' | 'retrying'
  provider: string
  providerMessageId?: string
  attemptCount: number
  maxAttempts: number
  lastAttemptAt?: string
  nextRetryAt?: string
  errorMessage?: string
  errorCode?: string
  metadata: Record<string, any>
  resourceType: string
  resourceId: string
  organizationId?: string
  createdAt: string
  updatedAt: string
  sentAt?: string
}

/**
 * Generate a unique idempotency key for email delivery
 */
export function generateEmailIdempotencyKey(
  resourceType: string,
  resourceId: string,
  recipientEmail: string,
  emailType?: string
): string {
  const timestamp = Date.now()
  const baseKey = `email_${resourceType}_${resourceId}_${recipientEmail}_${emailType || 'default'}_${timestamp}`
  
  // Hash to ensure consistent length and avoid special characters
  const hash = createHash('sha256').update(baseKey).digest('hex').substring(0, 32)
  
  return `email_${hash}`
}

/**
 * Check if an email with the given idempotency key has already been sent successfully
 */
export async function checkEmailSent(
  idempotencyKey: string
): Promise<EmailDelivery | null> {
  const supabase = await createServiceRoleClient()

  const { data, error } = await (supabase
    .from('email_deliveries')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .eq('status', 'sent')
    .single() as any)

  if (error || !data) {
    return null
  }

  const dataRecord = data as any
  return {
    id: dataRecord.id,
    emailType: dataRecord.email_type,
    recipientEmail: dataRecord.recipient_email,
    recipientName: dataRecord.recipient_name || undefined,
    idempotencyKey: dataRecord.idempotency_key,
    status: dataRecord.status as EmailDelivery['status'],
    provider: dataRecord.provider,
    providerMessageId: dataRecord.provider_message_id || undefined,
    attemptCount: dataRecord.attempt_count,
    maxAttempts: dataRecord.max_attempts,
    lastAttemptAt: dataRecord.last_attempt_at || undefined,
    nextRetryAt: dataRecord.next_retry_at || undefined,
    errorMessage: dataRecord.error_message || undefined,
    errorCode: dataRecord.error_code || undefined,
    metadata: (data.metadata as Record<string, any>) || {},
    resourceType: data.resource_type,
    resourceId: data.resource_id,
    organizationId: data.organization_id || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    sentAt: data.sent_at || undefined,
  }
}

/**
 * Create an email delivery record in the database
 */
export async function createEmailDeliveryRecord(data: {
  emailType: string
  recipientEmail: string
  recipientName?: string
  idempotencyKey: string
  provider: string
  resourceType: string
  resourceId: string
  organizationId?: string
  metadata?: Record<string, any>
  maxAttempts?: number
}): Promise<string> {
  const supabase = await createServiceRoleClient()

  const { data: delivery, error } = await supabase
    .from('email_deliveries')
    .insert({
      email_type: data.emailType,
      recipient_email: data.recipientEmail,
      recipient_name: data.recipientName || null,
      idempotency_key: data.idempotencyKey,
      status: 'pending',
      provider: data.provider,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      organization_id: data.organizationId || null,
      metadata: data.metadata || {},
      max_attempts: data.maxAttempts || 5,
    })
    .select('id')
    .single()

  if (error || !delivery) {
    throw new Error(`Failed to create email delivery record: ${error?.message}`)
  }

  return delivery.id
}

/**
 * Update email delivery record after send attempt
 */
export async function updateEmailDelivery(
  deliveryId: string,
  updates: {
    status?: 'pending' | 'sent' | 'failed' | 'retrying'
    providerMessageId?: string
    attemptCount?: number
    lastAttemptAt?: Date
    nextRetryAt?: Date
    errorMessage?: string
    errorCode?: string
    sentAt?: Date
  }
): Promise<void> {
  const supabase = await createServiceRoleClient()

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.status) updateData.status = updates.status
  if (updates.providerMessageId) updateData.provider_message_id = updates.providerMessageId
  if (updates.attemptCount !== undefined) updateData.attempt_count = updates.attemptCount
  if (updates.lastAttemptAt) updateData.last_attempt_at = updates.lastAttemptAt.toISOString()
  if (updates.nextRetryAt) updateData.next_retry_at = updates.nextRetryAt.toISOString()
  if (updates.errorMessage) updateData.error_message = updates.errorMessage
  if (updates.errorCode) updateData.error_code = updates.errorCode
  if (updates.sentAt) updateData.sent_at = updates.sentAt.toISOString()

  const { error } = await supabase
    .from('email_deliveries')
    .update(updateData)
    .eq('id', deliveryId)

  if (error) {
    throw new Error(`Failed to update email delivery: ${error.message}`)
  }
}

