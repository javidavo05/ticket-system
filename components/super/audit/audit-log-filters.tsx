'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SuperFormField } from '@/components/super/form-field'

interface AuditLogFiltersProps {
  initialFilters: {
    userId?: string
    action?: string
    resourceType?: string
    startDate?: string
    endDate?: string
  }
}

export function AuditLogFilters({ initialFilters }: AuditLogFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/super/audit/logs?${params.toString()}`)
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <SuperFormField label="User ID">
            <Input
              type="text"
              defaultValue={initialFilters.userId}
              onChange={(e) => handleFilter('userId', e.target.value)}
              className="h-8 text-xs"
              placeholder="User ID"
            />
          </SuperFormField>

          <SuperFormField label="Action">
            <Select
              defaultValue={initialFilters.action || 'all'}
              onValueChange={(value) => handleFilter('action', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="theme_created">Theme Created</SelectItem>
                <SelectItem value="theme_updated">Theme Updated</SelectItem>
                <SelectItem value="theme_activated">Theme Activated</SelectItem>
                <SelectItem value="platform_settings_updated">Platform Settings Updated</SelectItem>
              </SelectContent>
            </Select>
          </SuperFormField>

          <SuperFormField label="Resource Type">
            <Select
              defaultValue={initialFilters.resourceType || 'all'}
              onValueChange={(value) => handleFilter('resourceType', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="theme">Theme</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="payment_provider">Payment Provider</SelectItem>
              </SelectContent>
            </Select>
          </SuperFormField>

          <SuperFormField label="Start Date">
            <Input
              type="date"
              defaultValue={initialFilters.startDate}
              onChange={(e) => handleFilter('startDate', e.target.value)}
              className="h-8 text-xs"
            />
          </SuperFormField>

          <SuperFormField label="End Date">
            <Input
              type="date"
              defaultValue={initialFilters.endDate}
              onChange={(e) => handleFilter('endDate', e.target.value)}
              className="h-8 text-xs"
            />
          </SuperFormField>
        </div>
      </CardContent>
    </Card>
  )
}
