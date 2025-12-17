'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuperFormField } from '@/components/super/form-field'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { updateNFCSettings } from '@/server-actions/super/cashless/update-nfc-settings'

interface NFCSettingsFormProps {
  initialSettings: {
    enabled: boolean
    tokenExpiration: number
    bandReassignment: boolean
    antiCloning: boolean
  }
}

export function NFCSettingsForm({ initialSettings }: NFCSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateNFCSettings(settings)
      router.refresh()
    } catch (error: any) {
      console.error('Error updating NFC settings:', error)
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
                Enable NFC System
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
            <CardTitle className="text-base">Token Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Token Expiration (seconds)">
              <Input
                type="number"
                value={settings.tokenExpiration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    tokenExpiration: parseInt(e.target.value) || 0,
                  })
                }
                className="text-xs"
              />
            </SuperFormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Security Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="band-reassignment" className="text-xs font-medium">
                Allow Band Reassignment
              </Label>
              <Switch
                id="band-reassignment"
                checked={settings.bandReassignment}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, bandReassignment: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="anti-cloning" className="text-xs font-medium">
                Anti-Cloning Protection
              </Label>
              <Switch
                id="anti-cloning"
                checked={settings.antiCloning}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, antiCloning: checked })
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
