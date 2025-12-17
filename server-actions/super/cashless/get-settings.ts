'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'

export async function getCashlessSettings() {
  await requireSuperAdmin()

  // TODO: Implement actual cashless settings retrieval from database
  return {
    enabled: true,
    walletLimits: {
      maxBalance: 10000,
      minReload: 10,
      maxReload: 1000,
    },
    eventWalletScoping: true,
    nfcEnforcement: false,
  }
}
