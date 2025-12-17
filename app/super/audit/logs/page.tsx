import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getAuditLogs } from '@/server-actions/super/audit/get-logs'
import { SuperTable, SuperTableHeader, SuperTableBody, SuperTableHead, SuperTableRow, SuperTableCell } from '@/components/super/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AuditLogFilters } from '@/components/super/audit/audit-log-filters'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: {
    userId?: string
    action?: string
    resourceType?: string
    startDate?: string
    endDate?: string
  }
}) {
  await requireSuperAdmin()

  const logs = await getAuditLogs({
    ...searchParams,
    limit: 50,
    offset: 0,
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Audit Logs</h1>
        <p className="text-xs text-text-muted mt-0.5">
          View system change history and audit trail
        </p>
      </div>

      <AuditLogFilters initialFilters={searchParams} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-muted">
              No audit logs found
            </div>
          ) : (
            <SuperTable>
              <SuperTableHeader>
                <SuperTableRow>
                  <SuperTableHead>Timestamp</SuperTableHead>
                  <SuperTableHead>User</SuperTableHead>
                  <SuperTableHead>Action</SuperTableHead>
                  <SuperTableHead>Resource</SuperTableHead>
                  <SuperTableHead>Details</SuperTableHead>
                </SuperTableRow>
              </SuperTableHeader>
              <SuperTableBody>
                {logs.map((log) => (
                  <SuperTableRow key={log.id}>
                    <SuperTableCell className="text-xs text-text-muted">
                      {log.createdAt.toLocaleString()}
                    </SuperTableCell>
                    <SuperTableCell className="text-xs">
                      {log.userId || 'System'}
                    </SuperTableCell>
                    <SuperTableCell className="text-xs font-medium">
                      {log.action}
                    </SuperTableCell>
                    <SuperTableCell className="text-xs">
                      {log.resourceType} / {log.resourceId}
                    </SuperTableCell>
                    <SuperTableCell className="text-xs text-text-muted">
                      {log.metadata ? JSON.stringify(log.metadata).substring(0, 50) + '...' : '-'}
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
