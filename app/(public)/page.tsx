import { getEvents } from '@/server-actions/events/list'
import Link from 'next/link'

export default async function HomePage() {
  const { events } = await getEvents()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Upcoming Events</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: any) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="block p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">{event.name}</h2>
            <p className="text-gray-600 mb-4">{event.description}</p>
            <div className="text-sm text-gray-500">
              <p>{new Date(event.start_date).toLocaleDateString()}</p>
              <p>{event.location_name}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

