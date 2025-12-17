'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    label: string
  }
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  className?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
  className,
}: KPICardProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
    success: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800',
    warning: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800',
    error: 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800',
    info: 'bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800',
  }

  const valueStyles = {
    default: 'text-gray-900 dark:text-gray-100',
    success: 'text-success-700 dark:text-success-400',
    warning: 'text-warning-700 dark:text-warning-400',
    error: 'text-error-700 dark:text-error-400',
    info: 'text-info-700 dark:text-info-400',
  }

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p
              className={cn(
                'text-2xl font-bold',
                valueStyles[variant]
              )}
            >
              {typeof value === 'number'
                ? value.toLocaleString('es-ES', {
                    minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
                    maximumFractionDigits: value % 1 !== 0 ? 2 : 0,
                  })
                : value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-xs font-medium',
                  trend.value > 0
                    ? 'text-success-600 dark:text-success-500'
                    : trend.value < 0
                    ? 'text-error-600 dark:text-error-500'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {trend.value > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend.value < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>
                  {trend.value > 0 ? '+' : ''}
                  {trend.value.toFixed(1)}% {trend.label}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                'rounded-full p-3',
                variant === 'default'
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : variant === 'success'
                  ? 'bg-success-100 dark:bg-success-900/40'
                  : variant === 'warning'
                  ? 'bg-warning-100 dark:bg-warning-900/40'
                  : variant === 'error'
                  ? 'bg-error-100 dark:bg-error-900/40'
                  : 'bg-info-100 dark:bg-info-900/40'
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
