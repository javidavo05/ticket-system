import { getEventBySlug } from '@/server-actions/events/list'
import { notFound } from 'next/navigation'
import { EventHero } from '@/components/events/event-hero'
import { EventTicketTypesClient } from '@/components/events/event-ticket-types-client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEventBySlug(params.slug)

  if (!event) {
    notFound()
  }

  const ticketTypes = Array.isArray(event.ticket_types)
    ? event.ticket_types
    : event.ticket_types
    ? [event.ticket_types]
    : []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Hero */}
        <EventHero
          name={event.name}
          description={event.description}
          startDate={event.start_date}
          endDate={event.end_date}
          locationName={event.location_name}
          locationAddress={event.location_address}
          eventType={event.event_type}
        />

        {/* Ticket Types Section */}
        <div className="mt-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Tipos de Tickets
          </h2>

          {ticketTypes.length > 0 ? (
            <EventTicketTypesClient
              ticketTypes={ticketTypes}
              eventSlug={params.slug}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No hay tickets disponibles</AlertTitle>
              <AlertDescription>
                Los tickets para este evento aún no están disponibles.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
