'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuperFormField } from '@/components/super/form-field'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { updateCashlessSettings } from '@/server-actions/super/cashless/update-settings'

interface CashlessSettingsFormProps {
  initialSettings: {
    enabled: boolean
    walletLimits: {
      maxBalance: number
      minReload: number
      maxReload: number
    }
    eventWalletScoping: boolean
    nfcEnforcement: boolean
  }
}

export function CashlessSettingsForm({ initialSettings }: CashlessSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateCashlessSettings(settings)
      router.refresh()
    } catch (error: any) {
      console.error('Error updating cashless settings:', error)
      alert(error.message || 'Failed to update settings')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled" className="text-xs font-medium">
                Enable Cashless System
              </Label>
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Wallet Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Max Balance">
              <Input
                type="number"
                value={settings.walletLimits.maxBalance}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    walletLimits: {
                      ...settings.walletLimits,
                      maxBalance: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Min Reload Amount">
              <Input
                type="number"
                value={settings.walletLimits.minReload}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    walletLimits: {
                      ...settings.walletLimits,
                      minReload: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Max Reload Amount">
              <Input
                type="number"
                value={settings.walletLimits.maxReload}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    walletLimits: {
                      ...settings.walletLimits,
                      maxReload: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="event-scoping" className="text-xs font-medium">
                Event Wallet Scoping
              </Label>
              <Switch
                id="event-scoping"
                checked={settings.eventWalletScoping}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, eventWalletScoping: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="nfc-enforcement" className="text-xs font-medium">
                NFC Enforcement
              </Label>
              <Switch
                id="nfc-enforcement"
                checked={settings.nfcEnforcement}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, nfcEnforcement: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </form>
  )
}
