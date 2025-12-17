import { requireSuperAdmin } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SuperTable, SuperTableHeader, SuperTableBody, SuperTableHead, SuperTableRow, SuperTableCell } from '@/components/super/table'
import { Checkbox } from '@/components/ui/checkbox'
import { ROLES } from '@/lib/utils/constants'

export default async function PermissionsPage() {
  await requireSuperAdmin()

  // TODO: Fetch actual permissions from database
  const roles = Object.values(ROLES)
  const resources = ['events', 'tickets', 'users', 'finance', 'themes']
  const actions = ['read', 'write', 'delete', 'scan']

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Permission Matrix</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Manage role permissions across resources and actions
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <SuperTable>
              <SuperTableHeader>
                <SuperTableRow>
                  <SuperTableHead>Role / Resource</SuperTableHead>
                  {actions.map((action) => (
                    <SuperTableHead key={action} className="text-center">
                      {action}
                    </SuperTableHead>
                  ))}
                </SuperTableRow>
              </SuperTableHeader>
              <SuperTableBody>
                {roles.map((role) =>
                  resources.map((resource) => (
                    <SuperTableRow key={`${role}-${resource}`}>
                      <SuperTableCell className="font-medium text-xs">
                        {role === resources.indexOf(resource) ? (
                          <span className="font-semibold">{role}</span>
                        ) : (
                          <span className="ml-4 text-text-muted">{resource}</span>
                        )}
                      </SuperTableCell>
                      {actions.map((action) => (
                        <SuperTableCell key={action} className="text-center">
                          <Checkbox
                            defaultChecked={role === ROLES.SUPER_ADMIN}
                            disabled
                          />
                        </SuperTableCell>
                      ))}
                    </SuperTableRow>
                  ))
                )}
              </SuperTableBody>
            </SuperTable>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
