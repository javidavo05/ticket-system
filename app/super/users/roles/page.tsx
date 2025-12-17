import { requireSuperAdmin } from '@/lib/auth/permissions'
import { listRoles } from '@/server-actions/super/users/list-roles'
import { SuperTable, SuperTableHeader, SuperTableBody, SuperTableHead, SuperTableRow, SuperTableCell } from '@/components/super/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function RolesPage() {
  await requireSuperAdmin()

  const roles = await listRoles()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Role Definitions</h1>
        <p className="text-xs text-text-muted mt-0.5">
          View and manage role definitions and permissions
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <SuperTable>
            <SuperTableHeader>
              <SuperTableRow>
                <SuperTableHead>Role</SuperTableHead>
                <SuperTableHead>Description</SuperTableHead>
                <SuperTableHead>Permissions</SuperTableHead>
                <SuperTableHead>Hard Limits</SuperTableHead>
              </SuperTableRow>
            </SuperTableHeader>
            <SuperTableBody>
              {roles.map((role) => (
                <SuperTableRow key={role.name}>
                  <SuperTableCell className="font-medium">
                    {role.name}
                  </SuperTableCell>
                  <SuperTableCell className="text-xs text-text-muted">
                    {role.description}
                  </SuperTableCell>
                  <SuperTableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 3).map((perm) => (
                        <Badge key={perm} variant="default" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                      {role.permissions.length > 3 && (
                        <Badge variant="default" className="text-xs">
                          +{role.permissions.length - 3}
                        </Badge>
                      )}
                    </div>
                  </SuperTableCell>
                  <SuperTableCell className="text-xs text-text-muted">
                    {Object.keys(role.hardLimits).length > 0
                      ? JSON.stringify(role.hardLimits)
                      : 'None'}
                  </SuperTableCell>
                </SuperTableRow>
              ))}
            </SuperTableBody>
          </SuperTable>
        </CardContent>
      </Card>
    </div>
  )
}
