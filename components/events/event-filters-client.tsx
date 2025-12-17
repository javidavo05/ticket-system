'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EventFiltersComponent, type EventFilters } from './event-filters'

interface EventFiltersClientProps {
  initialFilters: EventFilters
}

export function EventFiltersClient({ initialFilters }: EventFiltersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<EventFilters>(initialFilters)

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.eventType) params.set('eventType', filters.eventType)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.isFree) params.set('isFree', 'true')

    const newUrl = params.toString() ? `?${params.toString()}` : '/'
    router.push(newUrl, { scroll: false })
  }, [filters, router])

  return (
    <EventFiltersComponent
      filters={filters}
      onFiltersChange={setFilters}
    />
  )
}
