'use server'

import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getThemeVersions } from '@/lib/services/themes/versioning'
import { validateThemeExists } from '@/lib/services/admin/themes/helpers'

export async function getThemeVersionsAction(themeId: string) {
  await requireSuperAdmin()

  // Validate theme exists
  await validateThemeExists(themeId)

  // Get versions using existing service
  const versions = await getThemeVersions(themeId)

  return versions.map((version) => ({
    id: version.id,
    themeId: version.themeId,
    version: version.version,
    versionHash: version.versionHash,
    createdBy: version.createdBy,
    createdAt: version.createdAt,
    // Don't return full config in list - use getThemeVersion for that
  }))
}
