'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'

export async function listPaymentProviders() {
  await requireSuperAdmin()

  // TODO: Implement actual payment providers retrieval from database
  return [
    {
      id: 'stripe',
      name: 'Stripe',
      enabled: true,
      mode: 'live' as const,
      updatedAt: new Date(),
    },
    {
      id: 'paypal',
      name: 'PayPal',
      enabled: false,
      mode: 'test' as const,
      updatedAt: new Date(),
    },
  ]
}
