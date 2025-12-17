'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'

export async function getPaymentProvider(id: string) {
  await requireSuperAdmin()

  // TODO: Implement actual payment provider retrieval from database
  return {
    id,
    name: id === 'stripe' ? 'Stripe' : 'PayPal',
    enabled: true,
    mode: 'live' as const,
    credentials: {
      apiKey: 'sk_live_***',
      webhookSecret: 'whsec_***',
    },
    webhookUrl: 'https://api.sistemadeventa.com/webhooks/payments/stripe',
    updatedAt: new Date(),
  }
}
