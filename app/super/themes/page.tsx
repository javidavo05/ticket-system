import { requireSuperAdmin } from '@/lib/auth/permissions'
import { listThemes } from '@/server-actions/admin/themes/list'
import { activateTheme, deactivateTheme } from '@/server-actions/admin/themes/activate'
import { deleteTheme } from '@/server-actions/admin/themes/delete'
import { SuperTable, SuperTableHeader, SuperTableBody, SuperTableHead, SuperTableRow, SuperTableCell } from '@/components/super/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { Edit, Trash2, Power, Eye } from 'lucide-react'
import { ThemeActions } from '@/components/super/themes/theme-actions'

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: { isActive?: string; organizationId?: string; eventId?: string }
}) {
  await requireSuperAdmin()

  const filters = {
    isActive: searchParams.isActive ? searchParams.isActive === 'true' : undefined,
    organizationId: searchParams.organizationId,
    eventId: searchParams.eventId,
    limit: 50,
    offset: 0,
  }

  const themes = await listThemes(filters)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-default">Theme Management</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage platform themes, versions, and assignments
          </p>
        </div>
        <Link href="/super/themes/new">
          <Button size="sm">Create Theme</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-default mb-1">
                Status
              </label>
              <Select defaultValue={searchParams.isActive || 'all'}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Themes Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Themes</CardTitle>
        </CardHeader>
        <CardContent>
          {themes.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-muted">
              No themes found
            </div>
          ) : (
            <SuperTable>
              <SuperTableHeader>
                <SuperTableRow>
                  <SuperTableHead>Name</SuperTableHead>
                  <SuperTableHead>Version</SuperTableHead>
                  <SuperTableHead>Status</SuperTableHead>
                  <SuperTableHead>Assignments</SuperTableHead>
                  <SuperTableHead>Created</SuperTableHead>
                  <SuperTableHead className="text-right">Actions</SuperTableHead>
                </SuperTableRow>
              </SuperTableHeader>
              <SuperTableBody>
                {themes.map((theme) => (
                  <SuperTableRow key={theme.id}>
                    <SuperTableCell className="font-medium">{theme.name}</SuperTableCell>
                    <SuperTableCell className="text-text-muted">
                      v{theme.version}
                    </SuperTableCell>
                    <SuperTableCell>
                      <Badge
                        variant={theme.isActive ? 'success' : 'default'}
                        className="text-xs"
                      >
                        {theme.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </SuperTableCell>
                    <SuperTableCell className="text-xs text-text-muted">
                      {theme.organizationId && 'Org'}
                      {theme.organizationId && theme.eventId && ', '}
                      {theme.eventId && 'Event'}
                      {!theme.organizationId && !theme.eventId && 'None'}
                    </SuperTableCell>
                    <SuperTableCell className="text-xs text-text-muted">
                      {theme.createdAt.toLocaleDateString()}
                    </SuperTableCell>
                    <SuperTableCell>
                      <ThemeActions theme={theme} />
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
