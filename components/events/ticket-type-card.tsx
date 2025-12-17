'use client'

import { useState } from 'react'
import { Ticket, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils/cn'

interface TicketTypeCardProps {
  id: string
  name: string
  description?: string | null
  price: string | number
  quantityAvailable: number
  quantitySold: number
  maxPerPurchase?: number | null
  saleStart?: string | null
  saleEnd?: string | null
  onAddToCart: (ticketTypeId: string, quantity: number) => void
  className?: string
}

export function TicketTypeCard({
  id,
  name,
  description,
  price,
  quantityAvailable,
  quantitySold,
  maxPerPurchase,
  saleStart,
  saleEnd,
  onAddToCart,
  className,
}: TicketTypeCardProps) {
  const [quantity, setQuantity] = useState(1)
  const priceNum = parseFloat(String(price))
  const isFree = priceNum === 0
  const available = quantityAvailable - quantitySold
  const isSoldOut = available <= 0
  const maxQuantity = maxPerPurchase ? Math.min(maxPerPurchase, available) : available

  const isOnSale = () => {
    const now = new Date()
    if (saleStart) {
      const start = new Date(saleStart)
      if (now < start) return false
    }
    if (saleEnd) {
      const end = new Date(saleEnd)
      if (now > end) return false
    }
    return true
  }

  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= maxQuantity && !isSoldOut && isOnSale()) {
      onAddToCart(id, quantity)
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  return (
    <Card className={cn('transition-all', isSoldOut && 'opacity-60', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl">{name}</CardTitle>
          <div className="text-right">
            {isFree ? (
              <Badge variant="success" className="text-lg px-3 py-1">
                Gratis
              </Badge>
            ) : (
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-500">
                ${priceNum.toFixed(2)}
              </div>
            )}
          </div>
        </div>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Availability */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {available} disponible{available !== 1 ? 's' : ''}
            </span>
          </div>
          {maxPerPurchase && (
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              <span>Máx. {maxPerPurchase} por compra</span>
            </div>
          )}
        </div>

        {/* Sale Period */}
        {(saleStart || saleEnd) && (
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {saleStart && (
              <p>Venta inicia: {formatDate(saleStart)}</p>
            )}
            {saleEnd && (
              <p>Venta termina: {formatDate(saleEnd)}</p>
            )}
          </div>
        )}

        {/* Status Alerts */}
        {isSoldOut && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Agotado</AlertDescription>
          </Alert>
        )}

        {!isOnSale() && !isSoldOut && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {saleStart && new Date(saleStart) > new Date()
                ? 'Las ventas aún no han comenzado'
                : 'Las ventas han terminado'}
            </AlertDescription>
          </Alert>
        )}

        {/* Quantity Selector */}
        {!isSoldOut && isOnSale() && (
          <div className="space-y-2">
            <Label htmlFor={`quantity-${id}`}>Cantidad</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <Input
                id={`quantity-${id}`}
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1
                  setQuantity(Math.max(1, Math.min(maxQuantity, val)))
                }}
                className="w-20 text-center"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
              >
                +
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleAddToCart}
          disabled={isSoldOut || !isOnSale() || quantity <= 0}
          className="w-full"
          size="lg"
        >
          {isSoldOut
            ? 'Agotado'
            : !isOnSale()
            ? 'No disponible'
            : `Agregar al carrito${quantity > 1 ? ` (${quantity})` : ''}`}
        </Button>
      </CardFooter>
    </Card>
  )
}
