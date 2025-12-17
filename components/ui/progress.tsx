'use client'

import { cn } from '@/lib/utils/cn'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indeterminate?: boolean
}

export function Progress({
  value = 0,
  max = 100,
  indeterminate = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full bg-primary-600 dark:bg-primary-500 transition-all',
          indeterminate && 'animate-pulse'
        )}
        style={
          indeterminate
            ? { width: '100%' }
            : { width: `${percentage}%` }
        }
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  )
}
