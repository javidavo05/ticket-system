'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { themeVersionSchema } from '@/lib/services/admin/themes/validation'
import { rollbackTheme } from '@/lib/services/themes/versioning'
import { invalidateTheme } from '@/lib/services/themes/cache-strategy'
import { validateThemeExists } from '@/lib/services/admin/themes/helpers'

export async function rollbackThemeVersion(themeId: string, targetVersion: number) {
  const user = await requireSuperAdmin()

  // Validate input
  const validated = themeVersionSchema.parse({ themeId, version: targetVersion })

  // Validate theme exists
  await validateThemeExists(validated.themeId)

  // Get current version before rollback for audit
  const { getThemeVersion } = await import('@/lib/services/themes/versioning')
  const currentVersion = await getThemeVersion(validated.themeId)
  const targetVersionData = await getThemeVersion(validated.themeId, validated.version)

  if (!targetVersionData) {
    throw new NotFoundError('Theme version')
  }

  if (!currentVersion) {
    throw new NotFoundError('Current theme version')
  }

  // Perform rollback
  const rolledBackTheme = await rollbackTheme(validated.themeId, validated.version)

  // Invalidate cache
  await invalidateTheme(validated.themeId, rolledBackTheme.version)

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_rolled_back',
      resourceType: 'theme',
      resourceId: validated.themeId,
      metadata: {
        themeName: rolledBackTheme.name,
        fromVersion: currentVersion.version,
        toVersion: validated.version,
      },
    },
    request
  )

  return {
    success: true,
    themeId: validated.themeId,
    fromVersion: currentVersion.version,
    toVersion: validated.version,
  }
}
