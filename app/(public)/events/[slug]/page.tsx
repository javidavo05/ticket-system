import { getEventBySlug } from '@/server-actions/events/list'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { purchaseTickets } from '@/server-actions/tickets/purchase'

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEventBySlug(params.slug)

  if (!event) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-gray-600 mb-8">{event.description}</p>

      <div className="mb-8">
        <p><strong>Date:</strong> {new Date(event.start_date).toLocaleDateString()}</p>
        <p><strong>Location:</strong> {event.location_name}</p>
        {event.location_address && (
          <p><strong>Address:</strong> {event.location_address}</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Ticket Types</h2>
        <div className="space-y-4">
          {Array.isArray(event.ticket_types) ? event.ticket_types.map((ticketType: any) => {
            const available = ticketType.quantity_available - ticketType.quantity_sold
            return (
              <div key={ticketType.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold">{ticketType.name}</h3>
                    {ticketType.description && (
                      <p className="text-gray-600">{ticketType.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      {available} tickets available
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${parseFloat(ticketType.price as string).toFixed(2)}</p>
                    {available > 0 ? (
                      <Link
                        href={`/events/${params.slug}/checkout?ticketType=${ticketType.id}`}
                        className="mt-2 inline-block bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
                      >
                        Buy Tickets
                      </Link>
                    ) : (
                      <p className="mt-2 text-red-600">Sold Out</p>
                    )}
                  </div>
                </div>
              </div>
            )
          }) : null}
        </div>
      </div>
    </div>
  )
}

