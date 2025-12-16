import { PAYMENT_PROVIDERS } from '@/lib/utils/constants'
import { YappyProvider } from './providers/yappy'
import { PagueloFacilProvider } from './providers/paguelofacil'
import { BankTransferProvider } from './providers/bank-transfer'
import { WalletProvider } from './providers/wallet'
import type { PaymentProvider } from './providers/base'

export interface CreatePaymentParams {
  amount: number
  currency?: string
  description?: string
  metadata?: Record<string, unknown>
  returnUrl?: string
  cancelUrl?: string
}

export interface PaymentSession {
  sessionId: string
  redirectUrl?: string
  paymentUrl?: string
  qrCode?: string
  expiresAt?: Date
}

export interface WebhookResult {
  paymentId: string
  status: 'completed' | 'failed' | 'pending'
  providerPaymentId?: string
  metadata?: Record<string, unknown>
}

export interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  providerPaymentId?: string
  metadata?: Record<string, unknown>
}

/**
 * Get payment provider by name (plugin-style architecture)
 */
export function getPaymentProvider(providerName: string): PaymentProvider {
  switch (providerName) {
    case PAYMENT_PROVIDERS.YAPPY:
      return new YappyProvider()
    case PAYMENT_PROVIDERS.PAGUELOFACIL:
      return new PagueloFacilProvider()
    case PAYMENT_PROVIDERS.BANK_TRANSFER:
      return new BankTransferProvider()
    case PAYMENT_PROVIDERS.WALLET:
      return new WalletProvider()
    default:
      throw new Error(`Unknown payment provider: ${providerName}`)
  }
}

/**
 * Get payment provider from environment or config
 */
export function getDefaultPaymentProvider(): PaymentProvider {
  const providerName = process.env.DEFAULT_PAYMENT_PROVIDER || PAYMENT_PROVIDERS.YAPPY
  return getPaymentProvider(providerName)
}

