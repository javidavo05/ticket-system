'use client'

import { TicketTypeCard } from './ticket-type-card'

interface TicketType {
  id: string
  name: string
  description?: string | null
  price: string | number
  quantityAvailable: number
  quantitySold: number
  maxPerPurchase?: number | null
  saleStart?: string | null
  saleEnd?: string | null
}

interface EventTicketTypesProps {
  ticketTypes: TicketType[]
  eventSlug: string
  onAddToCart?: (ticketTypeId: string, quantity: number) => void
}

export function EventTicketTypes({
  ticketTypes,
  eventSlug,
  onAddToCart,
}: EventTicketTypesProps) {
  const handleAddToCart = (ticketTypeId: string, quantity: number) => {
    if (onAddToCart) {
      onAddToCart(ticketTypeId, quantity)
    } else {
      // Default behavior: redirect to checkout
      window.location.href = `/events/${eventSlug}/checkout?ticketType=${ticketTypeId}&quantity=${quantity}`
    }
  }

  if (ticketTypes.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ticketTypes.map((ticketType) => (
        <TicketTypeCard
          key={ticketType.id}
          {...ticketType}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  )
}
