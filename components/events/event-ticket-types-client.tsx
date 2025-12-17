'use client'

import { TicketTypeCard } from './ticket-type-card'
import { useRouter } from 'next/navigation'

interface TicketType {
  id: string
  name: string
  description?: string | null
  price: string | number
  quantity_available: number
  quantity_sold: number
  max_per_purchase?: number | null
  sale_start?: string | null
  sale_end?: string | null
}

interface EventTicketTypesClientProps {
  ticketTypes: TicketType[]
  eventSlug: string
}

export function EventTicketTypesClient({
  ticketTypes,
  eventSlug,
}: EventTicketTypesClientProps) {
  const router = useRouter()

  const handleAddToCart = (ticketTypeId: string, quantity: number) => {
    router.push(
      `/events/${eventSlug}/checkout?ticketType=${ticketTypeId}&quantity=${quantity}`
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {ticketTypes.map((ticketType) => (
        <TicketTypeCard
          key={ticketType.id}
          id={ticketType.id}
          name={ticketType.name}
          description={ticketType.description}
          price={ticketType.price}
          quantityAvailable={ticketType.quantity_available}
          quantitySold={ticketType.quantity_sold}
          maxPerPurchase={ticketType.max_per_purchase}
          saleStart={ticketType.sale_start}
          saleEnd={ticketType.sale_end}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  )
}
