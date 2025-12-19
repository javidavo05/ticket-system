import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import { getProfile, getTicketHistory, getTicketCount, getWalletBalance } from '@/server-actions/user/profile'
import { format } from 'date-fns'
import Link from 'next/link'
import { redownloadTicket } from '@/server-actions/user/profile'
import { Suspense } from 'react'
import { ProfileSkeleton } from '@/components/ui/loading'

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/profile')
  }

  // Super admins no tienen cuenta de tickets - redirigir a admin dashboard
  const isSuper = await isSuperAdmin(user.id)
  if (isSuper) {
    redirect('/admin/dashboard')
  }

  // Fetch profile data
  const [profile, ticketHistory, ticketCount, wallet] = await Promise.all([
    getProfile(),
    getTicketHistory(10, 0),
    getTicketCount(),
    getWalletBalance(),
  ])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Mi Perfil</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                {profile.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt={profile.fullName || 'Profile'}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-200 flex items-center justify-center">
                    <span className="text-3xl text-gray-500">
                      {profile.fullName?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {profile.fullName || 'Usuario'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{profile.email}</p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{profile.phone || 'No especificado'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Balance de Wallet</label>
                  <p className="mt-1 text-lg font-semibold text-success-500">
                    ${wallet.balance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tickets Totales</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{ticketCount}</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link
                  href="/profile/edit"
                  className="block w-full text-center px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 transition"
                >
                  Editar Perfil
                </Link>
                <Link
                  href="/profile/payments"
                  className="block w-full text-center px-4 py-2 bg-success-500 text-white rounded-md hover:bg-success-600 transition"
                >
                  Ver Pagos
                </Link>
                <Link
                  href="/profile/wallet"
                  className="block w-full text-center px-4 py-2 bg-info-500 text-white rounded-md hover:bg-info-600 transition"
                >
                  Ver Wallet
                </Link>
                <Link
                  href="/profile/stats"
                  className="block w-full text-center px-4 py-2 bg-secondary-600 dark:bg-secondary-500 text-white rounded-md hover:bg-secondary-700 dark:hover:bg-secondary-600 transition"
                >
                  Estadísticas
                </Link>
              </div>
            </div>
          </div>

          {/* Ticket History */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Historial de Tickets</h2>

              {ticketHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No tienes tickets aún</p>
                  <Link
                    href="/events"
                    className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
                  >
                    Ver Eventos
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketHistory.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition bg-white dark:bg-gray-900"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {ticket.event?.name || 'Evento'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {ticket.ticketType?.name || 'Ticket'}
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-gray-500">
                            <p>
                              <span className="font-medium">Número:</span> {ticket.ticketNumber}
                            </p>
                            <p>
                              <span className="font-medium">Fecha:</span>{' '}
                              {ticket.event?.start_date
                                ? format(new Date(ticket.event.start_date), 'PPP')
                                : 'N/A'}
                            </p>
                            <p>
                              <span className="font-medium">Estado:</span>{' '}
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
                            {ticket.payment && (
                              <p>
                                <span className="font-medium">Monto:</span> $
                                {parseFloat(ticket.payment.amount as string).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          {ticket.status === 'paid' && (
                            <form action={async () => {
                              'use server'
                              const result = await redownloadTicket(ticket.id)
                              if (result.ticketUrl) {
                                // Redirect to ticket URL
                                redirect(result.ticketUrl)
                              }
                            }}>
                              <button
                                type="submit"
                                className="px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white text-sm rounded-md hover:bg-primary-700 dark:hover:bg-primary-600 transition"
                              >
                                Ver Ticket
                              </button>
                            </form>
                          )}
                          {ticket.event?.slug && (
                            <Link
                              href={`/events/${ticket.event.slug}`}
                              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition text-center"
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

              {ticketCount > 10 && (
                <div className="mt-6 text-center">
                  <Link
                    href="/profile/tickets"
                    className="text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-600 font-medium"
                  >
                    Ver todos los tickets ({ticketCount})
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

