'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuperFormField } from '@/components/super/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EmailSettingsFormProps {
  initialSettings: {
    provider: string
    sender: {
      name: string
      email: string
    }
    retryPolicies: {
      maxRetries: number
      backoff: string
    }
    throttling: {
      maxPerMinute: number
      maxPerHour: number
    }
  }
}

export function EmailSettingsForm({ initialSettings }: EmailSettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState(initialSettings)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Call updateEmailSettings server action
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.refresh()
    } catch (error: any) {
      console.error('Error updating email settings:', error)
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
            <CardTitle className="text-base">Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Email Provider">
              <Select
                value={settings.provider}
                onValueChange={(value) =>
                  setSettings({ ...settings, provider: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="ses">AWS SES</SelectItem>
                </SelectContent>
              </Select>
            </SuperFormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sender Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Sender Name">
              <Input
                value={settings.sender.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sender: { ...settings.sender, name: e.target.value },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Sender Email">
              <Input
                type="email"
                value={settings.sender.email}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sender: { ...settings.sender, email: e.target.value },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Retry Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Max Retries">
              <Input
                type="number"
                value={settings.retryPolicies.maxRetries}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    retryPolicies: {
                      ...settings.retryPolicies,
                      maxRetries: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Backoff Strategy">
              <Select
                value={settings.retryPolicies.backoff}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    retryPolicies: {
                      ...settings.retryPolicies,
                      backoff: value,
                    },
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="exponential">Exponential</SelectItem>
                </SelectContent>
              </Select>
            </SuperFormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Throttling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Max Per Minute">
              <Input
                type="number"
                value={settings.throttling.maxPerMinute}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    throttling: {
                      ...settings.throttling,
                      maxPerMinute: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Max Per Hour">
              <Input
                type="number"
                value={settings.throttling.maxPerHour}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    throttling: {
                      ...settings.throttling,
                      maxPerHour: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>
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
