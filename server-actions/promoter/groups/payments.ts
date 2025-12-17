'use server'

import { requirePromoter } from '@/lib/auth/permissions'
import { ValidationError } from '@/lib/utils/errors'
import {
  createGroupPayment,
  recordPartialPayment,
  calculateGroupPaymentStatus,
} from '@/lib/services/promoter/groups/payments'
import { z } from 'zod'

const createGroupPaymentSchema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive(),
  provider: z.string(),
  method: z.string(),
})

const recordPartialPaymentSchema = z.object({
  groupId: z.string().uuid(),
  amount: z.number().positive(),
  transactionId: z.string(),
  provider: z.string(),
})

const getGroupPaymentStatusSchema = z.object({
  groupId: z.string().uuid(),
})

export async function createGroupPaymentAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    groupId: formData.get('groupId') as string,
    amount: parseFloat(formData.get('amount') as string),
    provider: formData.get('provider') as string,
    method: formData.get('method') as string,
  }

  const validated = createGroupPaymentSchema.parse(data)

  const result = await createGroupPayment(
    validated.groupId,
    user.id,
    validated.amount,
    validated.provider,
    validated.method
  )

  return result
}

export async function recordPartialPaymentAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    groupId: formData.get('groupId') as string,
    amount: parseFloat(formData.get('amount') as string),
    transactionId: formData.get('transactionId') as string,
    provider: formData.get('provider') as string,
  }

  const validated = recordPartialPaymentSchema.parse(data)

  await recordPartialPayment(
    validated.groupId,
    validated.amount,
    validated.transactionId,
    validated.provider
  )

  return { success: true }
}

export async function getGroupPaymentStatusAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    groupId: formData.get('groupId') as string,
  }

  const validated = getGroupPaymentStatusSchema.parse(data)

  const status = await calculateGroupPaymentStatus(validated.groupId)

  return status
}

