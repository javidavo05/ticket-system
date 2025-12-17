import { getEvents } from '@/server-actions/events/list'
import { EventCard } from '@/components/events/event-card'
import { EventFiltersClient } from '@/components/events/event-filters-client'
import { LoadingSpinner } from '@/components/ui/loading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

interface EventsPageProps {
  searchParams: {
    search?: string
    eventType?: string
    startDate?: string
    endDate?: string
    isFree?: string
    page?: string
  }
}

async function EventsList({ filters }: { filters: any }) {
  try {
    const { events, pagination } = await getEvents(filters, 1, 20)

    if (!events || events.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No se encontraron eventos
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Intenta ajustar los filtros o vuelve más tarde
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: any) => (
          <EventCard
            key={event.id}
            id={event.id}
            slug={event.slug}
            name={event.name}
            description={event.description}
            startDate={event.start_date}
            endDate={event.end_date}
            locationName={event.location_name}
            locationAddress={event.location_address}
            isFree={event.isFree}
            ticketTypes={event.ticketTypes || []}
          />
        ))}
      </div>
    )
  } catch (error: any) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error al cargar eventos</AlertTitle>
        <AlertDescription>
          {error.message || 'No se pudieron cargar los eventos. Por favor, intenta más tarde.'}
        </AlertDescription>
      </Alert>
    )
  }
}

export default async function HomePage({ searchParams }: EventsPageProps) {
  const filters: any = {
    search: searchParams.search,
    eventType: searchParams.eventType,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
    isFree: searchParams.isFree === 'true' ? true : undefined,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Eventos Disponibles
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Descubre y compra tickets para los mejores eventos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <EventFiltersClient initialFilters={filters} />
          </aside>

          {/* Events Grid */}
          <main className="lg:col-span-3">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              }
            >
              <EventsList filters={filters} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}

