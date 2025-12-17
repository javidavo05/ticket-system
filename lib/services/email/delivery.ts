import { getEmailProvider } from './client'
import {
  generateEmailIdempotencyKey,
  checkEmailSent,
  createEmailDeliveryRecord,
  updateEmailDelivery,
  type EmailDelivery,
} from './idempotency'
import { calculateNextRetry, shouldRetry, isPermanentError, getErrorCode } from './retry'
import { logAuditEvent } from '@/lib/security/audit'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

export interface EmailDeliveryOptions {
  emailType: string
  to: string
  subject: string
  html: string
  text?: string
  recipientName?: string
  resourceType: string
  resourceId: string
  organizationId?: string
  metadata?: Record<string, any>
  idempotencyKey?: string
  maxAttempts?: number
}

export interface EmailDeliveryResult {
  success: boolean
  deliveryId?: string
  messageId?: string
  alreadySent?: boolean
  error?: string
  errorCode?: string
}

/**
 * Send email with full tracking, idempotency, and retry logic
 */
export async function sendEmailWithTracking(
  options: EmailDeliveryOptions,
  request?: NextRequest
): Promise<EmailDeliveryResult> {
  const provider = getEmailProvider()
  const providerName = process.env.EMAIL_PROVIDER || 'brevo'

  // Generate or use provided idempotency key
  const idempotencyKey =
    options.idempotencyKey ||
    generateEmailIdempotencyKey(
      options.resourceType,
      options.resourceId,
      options.to,
      options.emailType
    )

  // Check if email was already sent successfully
  const existingDelivery = await checkEmailSent(idempotencyKey)
  if (existingDelivery) {
    return {
      success: true,
      deliveryId: existingDelivery.id,
      messageId: existingDelivery.providerMessageId,
      alreadySent: true,
    }
  }

  // Create delivery record
  // Store email content in metadata for retry purposes
  const deliveryMetadata = {
    ...(options.metadata || {}),
    subject: options.subject,
    html: options.html,
    text: options.text || '',
  }

  let deliveryId: string
  try {
    deliveryId = await createEmailDeliveryRecord({
      emailType: options.emailType,
      recipientEmail: options.to,
      recipientName: options.recipientName,
      idempotencyKey,
      provider: providerName,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      organizationId: options.organizationId,
      metadata: deliveryMetadata,
      maxAttempts: options.maxAttempts || 5,
    })
  } catch (error) {
    // If record creation fails due to duplicate key, check again
    if (error instanceof Error && error.message.includes('idempotency_key')) {
      const existing = await checkEmailSent(idempotencyKey)
      if (existing) {
        return {
          success: true,
          deliveryId: existing.id,
          messageId: existing.providerMessageId,
          alreadySent: true,
        }
      }
    }
    throw error
  }

  // Attempt to send email
  try {
    const result = await provider.send({
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (result.success && result.messageId) {
      // Update delivery record as sent
      await updateEmailDelivery(deliveryId, {
        status: 'sent',
        providerMessageId: result.messageId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        sentAt: new Date(),
      })

      // Log audit event
      await logAuditEvent(
        {
          userId: undefined,
          action: 'email_sent',
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          metadata: {
            emailType: options.emailType,
            recipientEmail: options.to,
            provider: providerName,
            messageId: result.messageId,
          },
        },
        request
      )

      return {
        success: true,
        deliveryId,
        messageId: result.messageId,
      }
    } else {
      // Send failed but no error thrown
      const errorMessage = 'Email send failed without error'
      await handleEmailFailure(deliveryId, errorMessage, 1, options.maxAttempts || 5)

      return {
        success: false,
        deliveryId,
        error: errorMessage,
        errorCode: 'SEND_FAILED',
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = getErrorCode(errorMessage)
    const attemptCount = 1

    // Check if we should retry
    const willRetry = shouldRetry(attemptCount, options.maxAttempts || 5, errorMessage)

    if (willRetry && !isPermanentError(errorMessage)) {
      // Schedule retry
      const nextRetryAt = calculateNextRetry(attemptCount)
      await updateEmailDelivery(deliveryId, {
        status: 'retrying',
        attemptCount,
        lastAttemptAt: new Date(),
        nextRetryAt,
        errorMessage,
        errorCode,
      })

      // Log audit event
      await logAuditEvent(
        {
          userId: undefined,
          action: 'email_send_failed_retry',
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          metadata: {
            emailType: options.emailType,
            recipientEmail: options.to,
            error: errorMessage,
            errorCode,
            nextRetryAt: nextRetryAt.toISOString(),
          },
        },
        request
      )

      return {
        success: false,
        deliveryId,
        error: errorMessage,
        errorCode,
      }
    } else {
      // Permanent failure or max attempts reached
      await updateEmailDelivery(deliveryId, {
        status: 'failed',
        attemptCount,
        lastAttemptAt: new Date(),
        errorMessage,
        errorCode,
      })

      // Log audit event
      await logAuditEvent(
        {
          userId: undefined,
          action: 'email_send_failed',
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          metadata: {
            emailType: options.emailType,
            recipientEmail: options.to,
            error: errorMessage,
            errorCode,
            permanent: isPermanentError(errorMessage),
          },
        },
        request
      )

      return {
        success: false,
        deliveryId,
        error: errorMessage,
        errorCode,
      }
    }
  }
}

/**
 * Handle email send failure and schedule retry if appropriate
 */
async function handleEmailFailure(
  deliveryId: string,
  errorMessage: string,
  attemptCount: number,
  maxAttempts: number
): Promise<void> {
  const errorCode = getErrorCode(errorMessage)
  const willRetry = shouldRetry(attemptCount, maxAttempts, errorMessage)

  if (willRetry && !isPermanentError(errorMessage)) {
    const nextRetryAt = calculateNextRetry(attemptCount)
    await updateEmailDelivery(deliveryId, {
      status: 'retrying',
      attemptCount,
      lastAttemptAt: new Date(),
      nextRetryAt,
      errorMessage,
      errorCode,
    })
  } else {
    await updateEmailDelivery(deliveryId, {
      status: 'failed',
      attemptCount,
      lastAttemptAt: new Date(),
      errorMessage,
      errorCode,
    })
  }
}

/**
 * Retry a failed email delivery
 */
export async function retryEmailDelivery(
  deliveryId: string,
  request?: NextRequest
): Promise<EmailDeliveryResult> {
  const supabase = await createServiceRoleClient()

  // Get delivery record
  const { data: delivery, error: fetchError } = await supabase
    .from('email_deliveries')
    .select('*')
    .eq('id', deliveryId)
    .single()

  if (fetchError || !delivery) {
    throw new Error(`Email delivery not found: ${deliveryId}`)
  }

  // Check if already sent
  if (delivery.status === 'sent') {
    return {
      success: true,
      deliveryId: delivery.id,
      messageId: delivery.provider_message_id || undefined,
      alreadySent: true,
    }
  }

  // Check if max attempts reached
  if (delivery.attempt_count >= delivery.max_attempts) {
    return {
      success: false,
      deliveryId: delivery.id,
      error: 'Maximum retry attempts reached',
      errorCode: 'MAX_ATTEMPTS',
    }
  }

  const provider = getEmailProvider()
  const newAttemptCount = delivery.attempt_count + 1

  try {
    // We need to get the email content from the original send attempt
    // For retries, we'll need to reconstruct or store the email content
    // For now, we'll throw an error if metadata doesn't contain the content
    const metadata = (delivery.metadata as Record<string, any>) || {}
    
    // Check if we have the email content in metadata
    if (!metadata.subject || !metadata.html) {
      throw new Error('Email content not available for retry. Original email content must be stored in metadata.')
    }

    const subject = metadata.subject
    const html = metadata.html
    const text = metadata.text || ''

    const result = await provider.send({
      to: delivery.recipient_email,
      subject,
      html,
      text,
    })

    if (result.success && result.messageId) {
      await updateEmailDelivery(deliveryId, {
        status: 'sent',
        providerMessageId: result.messageId,
        attemptCount: newAttemptCount,
        lastAttemptAt: new Date(),
        sentAt: new Date(),
      })

      return {
        success: true,
        deliveryId: delivery.id,
        messageId: result.messageId,
      }
    } else {
      const errorMessage = 'Email send failed without error'
      await handleEmailFailure(deliveryId, errorMessage, newAttemptCount, delivery.max_attempts)

      return {
        success: false,
        deliveryId: delivery.id,
        error: errorMessage,
        errorCode: 'SEND_FAILED',
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = getErrorCode(errorMessage)
    const willRetry = shouldRetry(newAttemptCount, delivery.max_attempts, errorMessage)

    if (willRetry && !isPermanentError(errorMessage)) {
      const nextRetryAt = calculateNextRetry(newAttemptCount)
      await updateEmailDelivery(deliveryId, {
        status: 'retrying',
        attemptCount: newAttemptCount,
        lastAttemptAt: new Date(),
        nextRetryAt,
        errorMessage,
        errorCode,
      })
    } else {
      await updateEmailDelivery(deliveryId, {
        status: 'failed',
        attemptCount: newAttemptCount,
        lastAttemptAt: new Date(),
        errorMessage,
        errorCode,
      })
    }

    return {
      success: false,
      deliveryId: delivery.id,
      error: errorMessage,
      errorCode,
    }
  }
}

