import { PaymentProvider } from './base'
import type {
  CreatePaymentParams,
  PaymentSession,
  WebhookResult,
  PaymentStatus,
} from '../gateway'
import { PAYMENT_PROVIDERS } from '@/lib/utils/constants'

export class WalletProvider extends PaymentProvider {
  name = PAYMENT_PROVIDERS.WALLET

  async createPaymentSession(params: CreatePaymentParams): Promise<PaymentSession> {
    this.validateParams(params)

    // Wallet payments are instant - no session needed
    // The payment is processed immediately
    return {
      sessionId: `wallet-${Date.now()}`,
      // No redirect - payment is processed server-side
    }
  }

  async verifyWebhook(signature: string, payload: string): Promise<boolean> {
    // Wallet payments don't have webhooks - they're processed synchronously
    return true
  }

  async processWebhook(payload: unknown): Promise<WebhookResult> {
    // Wallet payments are processed synchronously
    // This is not used but required by interface
    const data = payload as {
      payment_id: string
      status: string
    }

    return {
      paymentId: data.payment_id,
      status: this.mapStatus(data.status),
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    // Wallet payment status is managed internally
    return {
      status: 'completed', // Wallet payments are instant
    }
  }

  private mapStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' {
    return status as 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  }
}

