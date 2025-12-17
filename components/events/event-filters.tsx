'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'

export interface EventFilters {
  search?: string
  eventType?: string
  startDate?: string
  endDate?: string
  isFree?: boolean
}

interface EventFiltersProps {
  filters: EventFilters
  onFiltersChange: (filters: EventFilters) => void
  className?: string
}

export function EventFiltersComponent({
  filters,
  onFiltersChange,
  className,
}: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateFilter = (key: keyof EventFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '')

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <Input
          placeholder="Buscar eventos..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Mobile filter toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-500" />
          )}
        </Button>
      </div>

      {/* Filters panel */}
      <Card className={cn('lg:block', !isOpen && 'hidden')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Filtros</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Type */}
          <div>
            <Label htmlFor="event-type" className="mb-2 block">
              Tipo de evento
            </Label>
            <Select
              value={filters.eventType || 'all'}
              onValueChange={(value) => updateFilter('eventType', value === 'all' ? undefined : value)}
            >
              <SelectTrigger id="event-type">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="concert">Concierto</SelectItem>
                <SelectItem value="conference">Conferencia</SelectItem>
                <SelectItem value="workshop">Taller</SelectItem>
                <SelectItem value="sports">Deportes</SelectItem>
                <SelectItem value="theater">Teatro</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Fecha de inicio</Label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => updateFilter('startDate', e.target.value || undefined)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de fin</Label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => updateFilter('endDate', e.target.value || undefined)}
            />
          </div>

          {/* Free/Paid Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="free-only" className="cursor-pointer">
              Solo eventos gratis
            </Label>
            <Switch
              id="free-only"
              checked={filters.isFree === true}
              onCheckedChange={(checked) => updateFilter('isFree', checked ? true : undefined)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
