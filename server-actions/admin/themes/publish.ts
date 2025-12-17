'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { NotFoundError } from '@/lib/utils/errors'
import { logAuditEvent } from '@/lib/security/audit'
import { headers } from 'next/headers'
import { themeVersionSchema } from '@/lib/services/admin/themes/validation'
import { publishThemeVersion, getThemeVersion } from '@/lib/services/themes/versioning'
import { invalidateTheme } from '@/lib/services/themes/cache-strategy'
import { validateThemeExists } from '@/lib/services/admin/themes/helpers'

export async function publishThemeVersionAction(themeId: string, version: number) {
  const user = await requireSuperAdmin()

  // Validate input
  const validated = themeVersionSchema.parse({ themeId, version })

  // Validate theme exists
  await validateThemeExists(validated.themeId)

  // Check if version exists
  const versionData = await getThemeVersion(validated.themeId, validated.version)
  if (!versionData) {
    throw new NotFoundError('Theme version')
  }

  // Get current theme version for audit
  const currentVersion = await getThemeVersion(validated.themeId)

  // Publish version
  const publishedTheme = await publishThemeVersion(validated.themeId, validated.version)

  // Invalidate cache
  await invalidateTheme(validated.themeId, publishedTheme.version)

  // Log audit event
  const headersList = await headers()
  const request = new Request('http://localhost', {
    headers: headersList as any,
  })

  await logAuditEvent(
    {
      userId: user.id,
      action: 'theme_version_published',
      resourceType: 'theme',
      resourceId: validated.themeId,
      metadata: {
        themeName: publishedTheme.name,
        version: validated.version,
        previousVersion: currentVersion?.version || null,
        schemaVersion: publishedTheme.config ? '1.0.0' : null, // Would need to get from DB
      },
    },
    request
  )

  return {
    success: true,
    themeId: validated.themeId,
    version: validated.version,
    publishedAt: publishedTheme.publishedAt,
  }
}
