'use server'

import { requireRole } from '@/lib/auth/permissions'
import { processScan } from '@/lib/services/tickets/scanning'
import { ROLES } from '@/lib/utils/constants'
import { headers } from 'next/headers'

export async function processScanAction(
  qrSignature: string,
  location?: { lat: number; lng: number }
) {
  const user = await requireRole(ROLES.SCANNER)

  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList,
  })

  const result = await processScan(qrSignature, user.id, location, request)

  return result
}

