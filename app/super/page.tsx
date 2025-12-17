import { requireSuperAdmin } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function SuperDashboard() {
  await requireSuperAdmin()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-default">Platform Control Center</h1>
        <p className="text-sm text-text-muted mt-1">
          System-wide configuration and management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              Manage platform themes, versions, and assignments
            </p>
            <Link href="/super/themes">
              <Button variant="outline" size="sm" className="w-full">
                Manage Themes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Platform Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              Configure global defaults and system limits
            </p>
            <Link href="/super/platform/settings">
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              Manage payment provider configurations
            </p>
            <Link href="/super/payments/providers">
              <Button variant="outline" size="sm" className="w-full">
                Manage Providers
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cashless & NFC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              Configure wallet and NFC system settings
            </p>
            <Link href="/super/cashless/settings">
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Users & Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              Manage roles, permissions, and constraints
            </p>
            <Link href="/super/users/roles">
              <Button variant="outline" size="sm" className="w-full">
                Manage Roles
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-3">
              View system change history and audit trail
            </p>
            <Link href="/super/audit/logs">
              <Button variant="outline" size="sm" className="w-full">
                View Logs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
