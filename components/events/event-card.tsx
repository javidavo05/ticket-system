'use client'

import Link from 'next/link'
import { Calendar, MapPin, Ticket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface EventCardProps {
  id: string
  slug: string
  name: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  locationName?: string | null
  locationAddress?: string | null
  isFree?: boolean
  ticketTypes?: Array<{
    id: string
    name: string
    price: string | number
    quantityAvailable: number
    quantitySold: number
  }>
  imageUrl?: string | null
  className?: string
}

export function EventCard({
  id,
  slug,
  name,
  description,
  startDate,
  endDate,
  locationName,
  locationAddress,
  isFree,
  ticketTypes = [],
  imageUrl,
  className,
}: EventCardProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
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

  const minPrice = ticketTypes.length > 0
    ? Math.min(...ticketTypes.map((tt) => parseFloat(String(tt.price))))
    : null

  const isSoldOut = ticketTypes.length > 0 && ticketTypes.every(
    (tt) => tt.quantityAvailable <= tt.quantitySold
  )

  const formattedStartDate = formatDate(startDate)
  const formattedStartTime = formatTime(startDate)

  return (
    <Link href={`/events/${slug}`} className={cn('block', className)}>
      <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02]">
        {imageUrl && (
          <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
            <img
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
            {isSoldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Badge variant="error" className="text-lg px-4 py-2">
                  Agotado
                </Badge>
              </div>
            )}
          </div>
        )}
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
              {name}
            </h3>
            {isFree && (
              <Badge variant="success" className="shrink-0">
                Gratis
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
              {description}
            </p>
          )}
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            {formattedStartDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {formattedStartDate}
                  {formattedStartTime && ` • ${formattedStartTime}`}
                </span>
              </div>
            )}
            {locationName && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="line-clamp-1">{locationName}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              {ticketTypes.length} tipo{ticketTypes.length !== 1 ? 's' : ''}
            </span>
          </div>
          {minPrice !== null && !isFree && (
            <div className="text-lg font-semibold text-primary-600 dark:text-primary-500">
              Desde ${minPrice.toFixed(2)}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  )
}
