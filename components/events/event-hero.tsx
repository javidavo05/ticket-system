'use client'

import { Calendar, MapPin, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface EventHeroProps {
  name: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  locationName?: string | null
  locationAddress?: string | null
  imageUrl?: string | null
  eventType?: string | null
  className?: string
}

export function EventHero({
  name,
  description,
  startDate,
  endDate,
  locationName,
  locationAddress,
  imageUrl,
  eventType,
  className,
}: EventHeroProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  const formattedStartDate = formatDate(startDate)
  const formattedStartTime = formatTime(startDate)
  const formattedEndTime = formatTime(endDate)

  return (
    <div className={cn('relative', className)}>
      {/* Hero Image */}
      {imageUrl ? (
        <div className="relative h-96 w-full overflow-hidden rounded-lg mb-6">
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {name}
            </h1>
            {eventType && (
              <Badge variant="secondary" className="mb-2">
                {eventType}
              </Badge>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-500 dark:to-primary-700 rounded-lg p-8 md:p-12 mb-6">
          <div className="flex items-center gap-2 mb-4">
            {eventType && (
              <Badge variant="secondary">{eventType}</Badge>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {name}
          </h1>
        </div>
      )}

      {/* Event Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {formattedStartDate && (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formattedStartDate}
              </p>
              {formattedStartTime && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formattedStartTime}
                  {formattedEndTime && ` - ${formattedEndTime}`}
                </p>
              )}
            </div>
          </div>
        )}

        {locationName && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary-600 dark:text-primary-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {locationName}
              </p>
              {locationAddress && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {locationAddress}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="prose prose-gray dark:prose-invert max-w-none mb-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  )
}
