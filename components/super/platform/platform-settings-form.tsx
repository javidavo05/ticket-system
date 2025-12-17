'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuperFormField } from '@/components/super/form-field'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updatePlatformSettings } from '@/server-actions/super/platform/update-settings'

interface PlatformSettingsFormProps {
  initialSettings: {
    defaults: {
      currency: string
      timezone: string
      locale: string
    }
    features: {
      cashless: boolean
      nfc: boolean
      multiTenant: boolean
    }
    limits: {
      maxTicketsPerTransaction: number
      maxConcurrentScans: number
      rateLimitPerMinute: number
    }
  }
}

export function PlatformSettingsForm({ initialSettings }: PlatformSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updatePlatformSettings(settings)
      router.refresh()
    } catch (error: any) {
      console.error('Error updating platform settings:', error)
      alert(error.message || 'Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* Defaults */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Default Currency">
              <Select
                value={settings.defaults.currency}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    defaults: { ...settings.defaults, currency: value },
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                </SelectContent>
              </Select>
            </SuperFormField>

            <SuperFormField label="Default Timezone">
              <Input
                value={settings.defaults.timezone}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaults: { ...settings.defaults, timezone: e.target.value },
                  })
                }
                className="text-xs"
                placeholder="UTC"
              />
            </SuperFormField>

            <SuperFormField label="Default Locale">
              <Input
                value={settings.defaults.locale}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaults: { ...settings.defaults, locale: e.target.value },
                  })
                }
                className="text-xs"
                placeholder="en"
              />
            </SuperFormField>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="cashless" className="text-xs font-medium">
                Cashless System
              </Label>
              <Switch
                id="cashless"
                checked={settings.features.cashless}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, cashless: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="nfc" className="text-xs font-medium">
                NFC System
              </Label>
              <Switch
                id="nfc"
                checked={settings.features.nfc}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, nfc: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="multi-tenant" className="text-xs font-medium">
                Multi-Tenant
              </Label>
              <Switch
                id="multi-tenant"
                checked={settings.features.multiTenant}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, multiTenant: checked },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Max Tickets Per Transaction">
              <Input
                type="number"
                value={settings.limits.maxTicketsPerTransaction}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: {
                      ...settings.limits,
                      maxTicketsPerTransaction: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Max Concurrent Scans">
              <Input
                type="number"
                value={settings.limits.maxConcurrentScans}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: {
                      ...settings.limits,
                      maxConcurrentScans: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Rate Limit (per minute)">
              <Input
                type="number"
                value={settings.limits.rateLimitPerMinute}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    limits: {
                      ...settings.limits,
                      rateLimitPerMinute: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </form>
  )
}
