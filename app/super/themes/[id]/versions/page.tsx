import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getThemeById } from '@/server-actions/admin/themes/get'
import { getThemeVersionsAction } from '@/server-actions/admin/themes/versions'
import { rollbackThemeVersion } from '@/server-actions/admin/themes/rollback'
import { notFound } from 'next/navigation'
import { SuperTable, SuperTableHeader, SuperTableBody, SuperTableHead, SuperTableRow, SuperTableCell } from '@/components/super/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeVersionActions } from '@/components/super/themes/theme-version-actions'

export default async function ThemeVersionsPage({
  params,
}: {
  params: { id: string }
}) {
  await requireSuperAdmin()

  let theme
  try {
    theme = await getThemeById(params.id)
  } catch (error) {
    notFound()
  }

  const versions = await getThemeVersionsAction(params.id)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Theme Versions</h1>
        <p className="text-xs text-text-muted mt-0.5">{theme.name}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Version History</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-muted">
              No versions found
            </div>
          ) : (
            <SuperTable>
              <SuperTableHeader>
                <SuperTableRow>
                  <SuperTableHead>Version</SuperTableHead>
                  <SuperTableHead>Hash</SuperTableHead>
                  <SuperTableHead>Created</SuperTableHead>
                  <SuperTableHead>Created By</SuperTableHead>
                  <SuperTableHead className="text-right">Actions</SuperTableHead>
                </SuperTableRow>
              </SuperTableHeader>
              <SuperTableBody>
                {versions.map((version) => (
                  <SuperTableRow key={version.id}>
                    <SuperTableCell className="font-medium">
                      v{version.version}
                    </SuperTableCell>
                    <SuperTableCell className="font-mono text-xs text-text-muted">
                      {version.versionHash.substring(0, 8)}...
                    </SuperTableCell>
                    <SuperTableCell className="text-xs text-text-muted">
                      {version.createdAt.toLocaleString()}
                    </SuperTableCell>
                    <SuperTableCell className="text-xs text-text-muted">
                      {version.createdBy || 'System'}
                    </SuperTableCell>
                    <SuperTableCell>
                      <ThemeVersionActions
                        themeId={params.id}
                        version={version}
                        currentVersion={theme.version}
                      />
                    </SuperTableCell>
                  </SuperTableRow>
                ))}
              </SuperTableBody>
            </SuperTable>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
