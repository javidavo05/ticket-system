import type {
  CreatePaymentParams,
  PaymentSession,
  WebhookResult,
  PaymentStatus,
} from '../gateway'
import { generateIdempotencyKey } from '@/lib/security/crypto'

export abstract class PaymentProvider {
  abstract name: string

  /**
   * Create a payment session
   */
  abstract createPaymentSession(params: CreatePaymentParams): Promise<PaymentSession>

  /**
   * Verify webhook signature
   */
  abstract verifyWebhook(signature: string, payload: string): Promise<boolean>

  /**
   * Process webhook payload
   */
  abstract processWebhook(payload: unknown): Promise<WebhookResult>

  /**
   * Get payment status
   */
  abstract getPaymentStatus(paymentId: string): Promise<PaymentStatus>

  /**
   * Generate idempotency key for this provider
   */
  protected generateIdempotencyKey(): string {
    return generateIdempotencyKey()
  }

  /**
   * Validate payment parameters
   */
  protected validateParams(params: CreatePaymentParams): void {
    if (params.amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }
    if (params.amount > 100000) {
      throw new Error('Amount exceeds maximum limit')
    }
  }

  /**
   * Handle provider-specific errors
   */
  protected handleError(error: unknown): never {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown payment provider error')
  }
}

