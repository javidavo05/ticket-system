'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuperFormField } from '@/components/super/form-field'
import { Textarea } from '@/components/ui/textarea'

interface EventDefaultsFormProps {
  initialDefaults: {
    defaultTicketTypes: string[]
    defaultPricingRules: {
      currency: string
      taxRate: number
    }
    defaultValidationRules: {
      allowMultipleScans: boolean
      requireIdentity: boolean
    }
  }
}

export function EventDefaultsForm({ initialDefaults }: EventDefaultsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [defaults, setDefaults] = useState(initialDefaults)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Call updateEventDefaults server action
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.refresh()
    } catch (error: any) {
      console.error('Error updating defaults:', error)
      alert(error.message || 'Failed to update defaults')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Default Ticket Types</CardTitle>
          </CardHeader>
          <CardContent>
            <SuperFormField label="Ticket Types (comma-separated)">
              <Textarea
                value={defaults.defaultTicketTypes.join(', ')}
                onChange={(e) =>
                  setDefaults({
                    ...defaults,
                    defaultTicketTypes: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                className="text-xs min-h-[80px]"
                placeholder="General Admission, VIP, Early Bird"
              />
            </SuperFormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Default Pricing Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Currency">
              <Input
                value={defaults.defaultPricingRules.currency}
                onChange={(e) =>
                  setDefaults({
                    ...defaults,
                    defaultPricingRules: {
                      ...defaults.defaultPricingRules,
                      currency: e.target.value,
                    },
                  })
                }
                className="text-xs"
              />
            </SuperFormField>

            <SuperFormField label="Tax Rate">
              <Input
                type="number"
                step="0.01"
                value={defaults.defaultPricingRules.taxRate}
                onChange={(e) =>
                  setDefaults({
                    ...defaults,
                    defaultPricingRules: {
                      ...defaults.defaultPricingRules,
                      taxRate: parseFloat(e.target.value) || 0,
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
            {isLoading ? 'Saving...' : 'Save Defaults'}
          </Button>
        </div>
      </div>
    </form>
  )
}
