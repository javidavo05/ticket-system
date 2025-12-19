'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'

export async function updateCashlessSettings(data: {
  enabled?: boolean
  walletLimits?: {
    maxBalance?: number
    minReload?: number
    maxReload?: number
  }
  eventWalletScoping?: boolean
  nfcEnforcement?: boolean
}) {
  const user = await requireSuperAdmin()

  // TODO: Implement actual cashless settings update in database

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'cashless_settings_updated',
      resourceType: 'cashless',
      resourceId: 'settings',
      changes: {
        settings: {
          before: {},
          after: data,
        },
      },
    },
    request as any
  )

  return { success: true }
}
