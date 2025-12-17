'use client'

import { Wifi, WifiOff, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface OfflineIndicatorProps {
  isOnline: boolean
  pendingCount?: number
  className?: string
}

export function OfflineIndicator({
  isOnline,
  pendingCount = 0,
  className,
}: OfflineIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isOnline ? (
        <Badge variant="success" className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          <span>En línea</span>
        </Badge>
      ) : (
        <Badge variant="warning" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          <span>Sin conexión</span>
        </Badge>
      )}
      {pendingCount > 0 && (
        <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
        </Badge>
      )}
    </div>
  )
}
