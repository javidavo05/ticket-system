'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SuperFormField } from '@/components/super/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { assignThemeToOrganization } from '@/server-actions/admin/themes/assign-organization'
import { assignThemeToEvent } from '@/server-actions/admin/themes/assign-event'

interface ThemeAssignmentsProps {
  themeId: string
  assignments: {
    events: Array<{ id: string; name: string }>
    organizations: Array<{ id: string; name: string }>
    isDefaultForOrganization?: string
  }
}

export function ThemeAssignments({ themeId, assignments }: ThemeAssignmentsProps) {
  const router = useRouter()
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // TODO: Fetch organizations and events from server actions
  const organizations: Array<{ id: string; name: string }> = []
  const events: Array<{ id: string; name: string }> = []

  const handleAssignOrganization = async () => {
    if (!selectedOrg) return
    setIsLoading(true)
    try {
      await assignThemeToOrganization(themeId, selectedOrg)
      router.refresh()
      setSelectedOrg('')
    } catch (error: any) {
      console.error('Failed to assign theme to organization:', error)
      alert(error.message || 'Failed to assign theme')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignEvent = async () => {
    if (!selectedEvent) return
    setIsLoading(true)
    try {
      await assignThemeToEvent(themeId, selectedEvent)
      router.refresh()
      setSelectedEvent('')
    } catch (error: any) {
      console.error('Failed to assign theme to event:', error)
      alert(error.message || 'Failed to assign theme')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Organization Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Organization Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignOrganization}
              disabled={!selectedOrg || isLoading}
              size="sm"
              className="h-8"
            >
              Assign
            </Button>
          </div>

          {assignments.organizations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assignments.organizations.map((org) => (
                <Badge key={org.id} variant="default" className="text-xs">
                  {org.name}
                  {assignments.isDefaultForOrganization === org.id && ' (Default)'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Assignments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Event Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignEvent}
              disabled={!selectedEvent || isLoading}
              size="sm"
              className="h-8"
            >
              Assign
            </Button>
          </div>

          {assignments.events.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {assignments.events.map((event) => (
                <Badge key={event.id} variant="default" className="text-xs">
                  {event.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
