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
import { SecretInput } from '@/components/super/secret-input'
import { updatePaymentProvider } from '@/server-actions/super/payments/update-provider'
import { rotateWebhookSecret } from '@/server-actions/super/payments/rotate-webhook-secret'

interface PaymentProviderFormProps {
  provider: {
    id: string
    name: string
    enabled: boolean
    mode: 'test' | 'live'
    credentials: {
      apiKey: string
      webhookSecret: string
    }
    webhookUrl: string
  }
}

export function PaymentProviderForm({ provider }: PaymentProviderFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    enabled: provider.enabled,
    mode: provider.mode,
    apiKey: provider.credentials.apiKey,
    webhookSecret: provider.credentials.webhookSecret,
    webhookUrl: provider.webhookUrl,
  })
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set())

  const handleReveal = (secretType: string) => {
    setRevealedSecrets(new Set([...revealedSecrets, secretType]))
    // TODO: Log audit event for secret reveal
  }

  const handleRotateSecret = async () => {
    if (!confirm('Are you sure you want to rotate the webhook secret? This will invalidate the current secret.')) {
      return
    }

    setIsLoading(true)
    try {
      const result = await rotateWebhookSecret(provider.id)
      setFormData({ ...formData, webhookSecret: result.secret })
      router.refresh()
    } catch (error: any) {
      console.error('Error rotating webhook secret:', error)
      alert(error.message || 'Failed to rotate webhook secret')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updatePaymentProvider(provider.id, {
        enabled: formData.enabled,
        mode: formData.mode,
        credentials: {
          apiKey: formData.apiKey,
          webhookSecret: formData.webhookSecret,
        },
        webhookUrl: formData.webhookUrl,
      })
      router.refresh()
    } catch (error: any) {
      console.error('Error updating payment provider:', error)
      alert(error.message || 'Failed to update provider')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* Basic Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled" className="text-xs font-medium">
                Enabled
              </Label>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, enabled: checked })
                }
              />
            </div>

            <SuperFormField label="Mode">
              <Select
                value={formData.mode}
                onValueChange={(value: 'test' | 'live') =>
                  setFormData({ ...formData, mode: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </SuperFormField>
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="API Key">
              <SecretInput
                value={formData.apiKey}
                onChange={(value) => setFormData({ ...formData, apiKey: value })}
                onReveal={() => handleReveal('apiKey')}
              />
            </SuperFormField>

            <SuperFormField label="Webhook Secret">
              <div className="space-y-2">
                <SecretInput
                  value={formData.webhookSecret}
                  onChange={(value) =>
                    setFormData({ ...formData, webhookSecret: value })
                  }
                  onReveal={() => handleReveal('webhookSecret')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotateSecret}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  Rotate Secret
                </Button>
              </div>
            </SuperFormField>

            <SuperFormField label="Webhook URL">
              <Input
                value={formData.webhookUrl}
                onChange={(e) =>
                  setFormData({ ...formData, webhookUrl: e.target.value })
                }
                className="text-xs"
                placeholder="https://api.sistemadeventa.com/webhooks/payments/stripe"
              />
            </SuperFormField>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
