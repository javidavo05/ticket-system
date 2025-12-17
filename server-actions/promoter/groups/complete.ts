'use server'

import { requirePromoter } from '@/lib/auth/permissions'
import { ValidationError } from '@/lib/utils/errors'
import { completeGroup, cancelGroup, getGroupStatistics } from '@/lib/services/promoter/groups/completion'
import { z } from 'zod'

const completeGroupSchema = z.object({
  groupId: z.string().uuid(),
})

const cancelGroupSchema = z.object({
  groupId: z.string().uuid(),
  reason: z.string().min(1),
})

const getGroupStatisticsSchema = z.object({
  groupId: z.string().uuid(),
})

export async function completeGroupAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    groupId: formData.get('groupId') as string,
  }

  const validated = completeGroupSchema.parse(data)

  await completeGroup(validated.groupId, user.id)

  return { success: true }
}

export async function cancelGroupAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    groupId: formData.get('groupId') as string,
    reason: formData.get('reason') as string,
  }

  const validated = cancelGroupSchema.parse(data)

  await cancelGroup(validated.groupId, validated.reason, user.id)

  return { success: true }
}

export async function getGroupStatisticsAction(formData: FormData) {
  const user = await requirePromoter()

  const data = {
    groupId: formData.get('groupId') as string,
  }

  const validated = getGroupStatisticsSchema.parse(data)

  const statistics = await getGroupStatistics(validated.groupId)

  return statistics
}

