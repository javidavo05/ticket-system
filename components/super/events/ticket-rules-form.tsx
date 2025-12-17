'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuperFormField } from '@/components/super/form-field'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface TicketRulesFormProps {
  initialRules: {
    multiDayPolicies: {
      allowCrossDay: boolean
      requireSameEvent: boolean
    }
    scanValidation: {
      maxScansPerTicket: number
      allowReentry: boolean
    }
    refundPolicies: {
      allowRefunds: boolean
      refundWindow: number
    }
  }
}

export function TicketRulesForm({ initialRules }: TicketRulesFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [rules, setRules] = useState(initialRules)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Call updateTicketRules server action
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.refresh()
    } catch (error: any) {
      console.error('Error updating rules:', error)
      alert(error.message || 'Failed to update rules')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Multi-Day Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-cross-day" className="text-xs font-medium">
                Allow Cross-Day Tickets
              </Label>
              <Switch
                id="allow-cross-day"
                checked={rules.multiDayPolicies.allowCrossDay}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    multiDayPolicies: {
                      ...rules.multiDayPolicies,
                      allowCrossDay: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="require-same-event" className="text-xs font-medium">
                Require Same Event
              </Label>
              <Switch
                id="require-same-event"
                checked={rules.multiDayPolicies.requireSameEvent}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    multiDayPolicies: {
                      ...rules.multiDayPolicies,
                      requireSameEvent: checked,
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Scan Validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Max Scans Per Ticket">
              <Input
                type="number"
                value={rules.scanValidation.maxScansPerTicket}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    scanValidation: {
                      ...rules.scanValidation,
                      maxScansPerTicket: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow-reentry" className="text-xs font-medium">
                Allow Re-entry
              </Label>
              <Switch
                id="allow-reentry"
                checked={rules.scanValidation.allowReentry}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    scanValidation: {
                      ...rules.scanValidation,
                      allowReentry: checked,
                    },
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Refund Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-refunds" className="text-xs font-medium">
                Allow Refunds
              </Label>
              <Switch
                id="allow-refunds"
                checked={rules.refundPolicies.allowRefunds}
                onCheckedChange={(checked) =>
                  setRules({
                    ...rules,
                    refundPolicies: {
                      ...rules.refundPolicies,
                      allowRefunds: checked,
                    },
                  })
                }
              />
            </div>

            <SuperFormField label="Refund Window (days)">
              <Input
                type="number"
                value={rules.refundPolicies.refundWindow}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    refundPolicies: {
                      ...rules.refundPolicies,
                      refundWindow: parseInt(e.target.value) || 0,
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
            {isLoading ? 'Saving...' : 'Save Rules'}
          </Button>
        </div>
      </div>
    </form>
  )
}
