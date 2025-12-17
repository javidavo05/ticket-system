import { createServiceRoleClient } from '@/lib/supabase/server'
import { retryEmailDelivery } from './delivery'

/**
 * Process emails in the retry queue
 * Gets all emails that are ready for retry (next_retry_at <= NOW())
 */
export async function processEmailRetryQueue(limit: number = 50): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const supabase = await createServiceRoleClient()
  const now = new Date().toISOString()

  // Get emails ready for retry
  const { data: pendingEmails, error: fetchError } = await (supabase
    .from('email_deliveries')
    .select('id, status, attempt_count, max_attempts')
    .in('status', ['pending', 'retrying'])
    .lte('next_retry_at', now)
    .limit(limit) as any)

  if (fetchError) {
    throw new Error(`Failed to fetch pending emails: ${fetchError.message}`)
  }

  const emailsData = (pendingEmails || []) as any[]
  if (emailsData.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0

  // Process each email
  for (const email of emailsData) {
    try {
      const result = await retryEmailDelivery(email.id)

      if (result.success) {
        succeeded++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`Error retrying email ${email.id}:`, error)
      failed++
    }
  }

  return {
    processed: emailsData.length,
    succeeded,
    failed,
  }
}

/**
 * Schedule an email for retry
 */
export async function scheduleEmailRetry(deliveryId: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  // Get current delivery record
  const { data: delivery, error: fetchError } = await (supabase
    .from('email_deliveries')
    .select('attempt_count, max_attempts')
    .eq('id', deliveryId)
    .single() as any)

  if (fetchError || !delivery) {
    throw new Error(`Email delivery not found: ${deliveryId}`)
  }

  const deliveryData = delivery as any
  // Check if max attempts reached
  if (deliveryData.attempt_count >= deliveryData.max_attempts) {
    throw new Error(`Maximum retry attempts reached for email ${deliveryId}`)
  }

  // Calculate next retry time
  const { calculateNextRetry } = await import('./retry')
  const nextRetryAt = calculateNextRetry(deliveryData.attempt_count)

  // Update delivery record
  const { error: updateError } = await ((supabase
    .from('email_deliveries') as any)
    .update({
      status: 'retrying',
      next_retry_at: nextRetryAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId))

  if (updateError) {
    throw new Error(`Failed to schedule email retry: ${updateError.message}`)
  }
}

