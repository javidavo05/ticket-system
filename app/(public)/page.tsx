import { getEvents } from '@/server-actions/events/list'
import Link from 'next/link'

export default async function HomePage() {
  try {
    const { events } = await getEvents()

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Upcoming Events</h1>
        
        {events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="block p-6 border rounded-lg hover:shadow-lg transition-shadow"
              >
                <h2 className="text-2xl font-semibold mb-2">{event.name}</h2>
                <p className="text-gray-600 mb-4">{event.description || 'No description available'}</p>
                <div className="text-sm text-gray-500">
                  <p>{event.start_date ? new Date(event.start_date).toLocaleDateString() : 'Date TBA'}</p>
                  {event.location_name && <p>{event.location_name}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No events available at the moment.</p>
            <p className="text-gray-400 text-sm mt-2">Check back soon for upcoming events!</p>
          </div>
        )}
      </div>
    )
  } catch (error: any) {
    console.error('Error loading events:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Upcoming Events</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="font-semibold">Unable to load events</p>
          <p className="text-sm mt-1">Please check your Supabase configuration in the .env file</p>
        </div>
      </div>
    )
  }
}

