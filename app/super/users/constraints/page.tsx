import { requireSuperAdmin } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SuperFormField } from '@/components/super/form-field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RoleConstraintsForm } from '@/components/super/users/role-constraints-form'

export default async function RoleConstraintsPage() {
  await requireSuperAdmin()

  // TODO: Fetch actual constraints from database
  const constraints = {
    maxAdminsPerTenant: 5,
    maxScannersPerEvent: 10,
    maxPromotersPerEvent: 20,
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Role Assignment Constraints</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure hard limits for role assignments
        </p>
      </div>

      <RoleConstraintsForm initialConstraints={constraints} />
    </div>
  )
}
