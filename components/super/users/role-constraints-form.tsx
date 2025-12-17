'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SuperFormField } from '@/components/super/form-field'

interface RoleConstraintsFormProps {
  initialConstraints: {
    maxAdminsPerTenant: number
    maxScannersPerEvent: number
    maxPromotersPerEvent: number
  }
}

export function RoleConstraintsForm({ initialConstraints }: RoleConstraintsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [constraints, setConstraints] = useState(initialConstraints)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Call updateRoleConstraints server action
      await new Promise((resolve) => setTimeout(resolve, 500))
      router.refresh()
    } catch (error: any) {
      console.error('Error updating constraints:', error)
      alert(error.message || 'Failed to update constraints')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Constraints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SuperFormField label="Max Admins Per Tenant">
            <Input
              type="number"
              value={constraints.maxAdminsPerTenant}
              onChange={(e) =>
                setConstraints({
                  ...constraints,
                  maxAdminsPerTenant: parseInt(e.target.value) || 0,
                })
              }
              className="text-xs"
            />
          </SuperFormField>

          <SuperFormField label="Max Scanners Per Event">
            <Input
              type="number"
              value={constraints.maxScannersPerEvent}
              onChange={(e) =>
                setConstraints({
                  ...constraints,
                  maxScannersPerEvent: parseInt(e.target.value) || 0,
                })
              }
              className="text-xs"
            />
          </SuperFormField>

          <SuperFormField label="Max Promoters Per Event">
            <Input
              type="number"
              value={constraints.maxPromotersPerEvent}
              onChange={(e) =>
                setConstraints({
                  ...constraints,
                  maxPromotersPerEvent: parseInt(e.target.value) || 0,
                })
              }
              className="text-xs"
            />
          </SuperFormField>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Constraints'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
