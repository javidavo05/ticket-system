import { PaymentProvider } from './base'
import type {
  CreatePaymentParams,
  PaymentSession,
  WebhookResult,
  PaymentStatus,
} from '../gateway'
import { PAYMENT_PROVIDERS } from '@/lib/utils/constants'

export class BankTransferProvider extends PaymentProvider {
  name = PAYMENT_PROVIDERS.BANK_TRANSFER

  async createPaymentSession(params: CreatePaymentParams): Promise<PaymentSession> {
    this.validateParams(params)

    // Bank transfers require manual reconciliation
    // Generate a reference number for the payment
    const referenceNumber = `BT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`

    return {
      sessionId: referenceNumber,
      paymentUrl: `/payments/bank-transfer/${referenceNumber}`,
      // No redirect URL - user needs to complete transfer manually
    }
  }

  async verifyWebhook(signature: string, payload: string): Promise<boolean> {
    // Bank transfers don't have webhooks - manual reconciliation
    // This could be used for admin-initiated status updates
    return true
  }

  async processWebhook(payload: unknown): Promise<WebhookResult> {
    // Bank transfers are manually reconciled
    // This would be called when admin confirms payment
    const data = payload as {
      payment_id: string
      status: string
      reference_number?: string
    }

    return {
      paymentId: data.payment_id,
      status: this.mapStatus(data.status),
      providerPaymentId: data.reference_number,
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    // Bank transfer status is managed internally
    // This would query the database for payment status
    return {
      status: 'pending', // Default - actual status from DB
    }
  }

  private mapStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'> = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'confirmed': 'completed',
      'failed': 'failed',
      'cancelled': 'failed',
      'refunded': 'refunded',
    }
    return statusMap[status.toLowerCase()] || 'pending'
  }
}

