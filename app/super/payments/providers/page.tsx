import { requireSuperAdmin } from '@/lib/auth/permissions'
import { listPaymentProviders } from '@/server-actions/super/payments/list-providers'
import { SuperTable, SuperTableHeader, SuperTableBody, SuperTableHead, SuperTableRow, SuperTableCell } from '@/components/super/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Edit } from 'lucide-react'

export default async function PaymentProvidersPage() {
  await requireSuperAdmin()

  const providers = await listPaymentProviders()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Payment Providers</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Manage payment provider configurations
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-muted">
              No payment providers configured
            </div>
          ) : (
            <SuperTable>
              <SuperTableHeader>
                <SuperTableRow>
                  <SuperTableHead>Name</SuperTableHead>
                  <SuperTableHead>Status</SuperTableHead>
                  <SuperTableHead>Mode</SuperTableHead>
                  <SuperTableHead>Last Updated</SuperTableHead>
                  <SuperTableHead className="text-right">Actions</SuperTableHead>
                </SuperTableRow>
              </SuperTableHeader>
              <SuperTableBody>
                {providers.map((provider) => (
                  <SuperTableRow key={provider.id}>
                    <SuperTableCell className="font-medium">
                      {provider.name}
                    </SuperTableCell>
                    <SuperTableCell>
                      <Badge
                        variant={provider.enabled ? 'success' : 'default'}
                        className="text-xs"
                      >
                        {provider.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </SuperTableCell>
                    <SuperTableCell>
                      <Badge
                        variant={provider.mode === 'live' ? 'error' : 'default'}
                        className="text-xs"
                      >
                        {provider.mode}
                      </Badge>
                    </SuperTableCell>
                    <SuperTableCell className="text-xs text-text-muted">
                      {provider.updatedAt.toLocaleDateString()}
                    </SuperTableCell>
                    <SuperTableCell className="text-right">
                      <Link href={`/super/payments/providers/${provider.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </Link>
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
