import { requireSuperAdmin } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SuperTable, SuperTableHeader, SuperTableBody, SuperTableHead, SuperTableRow, SuperTableCell } from '@/components/super/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SuperFormField } from '@/components/super/form-field'

export default async function SystemLimitsPage() {
  await requireSuperAdmin()

  // TODO: Fetch actual limits from database
  const limits = [
    { endpoint: '/api/tickets/purchase', perUser: 10, perMinute: 60 },
    { endpoint: '/api/scanner/validate', perUser: 100, perMinute: 300 },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">System Limits & Safety</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Configure rate limits and safety thresholds
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rate Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <SuperTable>
            <SuperTableHeader>
              <SuperTableRow>
                <SuperTableHead>Endpoint</SuperTableHead>
                <SuperTableHead>Per User</SuperTableHead>
                <SuperTableHead>Per Minute</SuperTableHead>
                <SuperTableHead className="text-right">Actions</SuperTableHead>
              </SuperTableRow>
            </SuperTableHeader>
            <SuperTableBody>
              {limits.map((limit, index) => (
                <SuperTableRow key={index}>
                  <SuperTableCell className="font-mono text-xs">
                    {limit.endpoint}
                  </SuperTableCell>
                  <SuperTableCell>
                    <Input
                      type="number"
                      value={limit.perUser}
                      className="h-7 w-20 text-xs"
                    />
                  </SuperTableCell>
                  <SuperTableCell>
                    <Input
                      type="number"
                      value={limit.perMinute}
                      className="h-7 w-20 text-xs"
                    />
                  </SuperTableCell>
                  <SuperTableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      Save
                    </Button>
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
