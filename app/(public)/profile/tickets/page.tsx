import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import { getTicketHistory, getTicketCount } from '@/server-actions/user/profile'
import { format } from 'date-fns'
import Link from 'next/link'
import { redownloadTicket } from '@/server-actions/user/profile'

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/profile/tickets')
  }

  // Super admins no tienen cuenta de tickets - redirigir a admin dashboard
  const isSuper = await isSuperAdmin(user.id)
  if (isSuper) {
    redirect('/admin/dashboard')
  }

  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const [tickets, totalCount] = await Promise.all([
    getTicketHistory(limit, offset),
    getTicketCount(),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/profile"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            ← Volver al Perfil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Mis Tickets</h1>
          <p className="text-gray-600 mt-2">Total: {totalCount} tickets</p>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No tienes tickets aún</p>
            <Link
              href="/events"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Ver Eventos Disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white shadow rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {ticket.event?.name || 'Evento'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {ticket.ticketType?.name || 'Ticket'}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Número de Ticket:</span>
                        <p className="text-gray-900">{ticket.ticketNumber}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Estado:</span>
                        <p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              ticket.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : ticket.status === 'used'
                                ? 'bg-blue-100 text-blue-800'
                                : ticket.status === 'revoked'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {ticket.status === 'paid'
                              ? 'Pagado'
                              : ticket.status === 'used'
                              ? 'Usado'
                              : ticket.status === 'revoked'
                              ? 'Revocado'
                              : ticket.status === 'pending_payment'
                              ? 'Pendiente'
                              : ticket.status}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Fecha del Evento:</span>
                        <p className="text-gray-900">
                          {ticket.event?.start_date
                            ? format(new Date(ticket.event.start_date), 'PPP p')
                            : 'N/A'}
                        </p>
                      </div>
                      {ticket.payment && (
                        <div>
                          <span className="font-medium text-gray-700">Monto Pagado:</span>
                          <p className="text-gray-900">
                            ${parseFloat(ticket.payment.amount as string).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-6 flex flex-col gap-2">
                    {ticket.status === 'paid' && (
                      <form action={async () => {
                        'use server'
                        const result = await redownloadTicket(ticket.id)
                        if (result.ticketUrl) {
                          redirect(result.ticketUrl)
                        }
                      }}>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition whitespace-nowrap"
                        >
                          Ver/Descargar Ticket
                        </button>
                      </form>
                    )}
                    {ticket.event?.slug && (
                      <Link
                        href={`/events/${ticket.event.slug}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition text-center whitespace-nowrap"
                      >
                        Ver Evento
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center space-x-2">
            {page > 1 && (
              <Link
                href={`/profile/tickets?page=${page - 1}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Anterior
              </Link>
            )}
            <span className="text-sm text-gray-700">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/profile/tickets?page=${page + 1}`}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Siguiente
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

