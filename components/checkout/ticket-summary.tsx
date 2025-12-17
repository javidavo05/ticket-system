'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface TicketItem {
  ticketTypeId: string
  ticketTypeName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

interface TicketSummaryProps {
  items: TicketItem[]
  subtotal: number
  discount?: number
  total: number
  className?: string
}

export function TicketSummary({
  items,
  subtotal,
  discount = 0,
  total,
  className,
}: TicketSummaryProps) {
  return (
    <Card className={cn('sticky top-4', className)}>
      <CardHeader>
        <CardTitle>Resumen de Compra</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ticket Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.ticketTypeId} className="space-y-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {item.ticketTypeName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.quantity} × ${item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  ${item.subtotal.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-gray-100">
              ${subtotal.toFixed(2)}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Descuento</span>
              <span className="text-success-500">-${discount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span className="text-gray-900 dark:text-gray-100">Total</span>
            <span className="text-primary-600 dark:text-primary-500">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
