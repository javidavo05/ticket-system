import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import { getTicketCount, getTicketHistory } from '@/server-actions/user/profile'
import { getWalletBalance } from '@/server-actions/user/profile'
import { getUserPayments, getPaymentCount } from '@/server-actions/user/payments'
import { getWalletStats } from '@/server-actions/user/wallet'
import Link from 'next/link'

export default async function StatsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/profile/stats')
  }

  // Super admins no tienen cuenta de tickets - redirigir a admin dashboard
  const isSuper = await isSuperAdmin(user.id)
  if (isSuper) {
    redirect('/admin/dashboard')
  }

  // Fetch all stats in parallel
  const [ticketCount, tickets, walletBalance, paymentCount, payments, walletStats] = await Promise.all([
    getTicketCount(),
    getTicketHistory(100, 0), // Get more tickets for stats
    getWalletBalance(),
    getPaymentCount(),
    getUserPayments(100, 0), // Get more payments for stats
    getWalletStats(),
  ])

  // Calculate ticket stats
  const ticketsByStatus = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate total spent
  const totalSpent = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amountPaid, 0)

  // Get upcoming events (tickets with future dates)
  const now = new Date()
  const upcomingTickets = tickets.filter((ticket) => {
    if (!ticket.event?.start_date) return false
    return new Date(ticket.event.start_date) > now
  })

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
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Mis Estadísticas</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Tickets */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Tickets Totales</h3>
            <p className="text-3xl font-bold text-gray-900">{ticketCount}</p>
          </div>

          {/* Total Spent */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Gastado</h3>
            <p className="text-3xl font-bold text-green-600">${totalSpent.toFixed(2)}</p>
          </div>

          {/* Wallet Balance */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Balance de Wallet</h3>
            <p className="text-3xl font-bold text-indigo-600">${walletBalance.balance.toFixed(2)}</p>
          </div>

          {/* Total Payments */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Pagos Totales</h3>
            <p className="text-3xl font-bold text-gray-900">{paymentCount}</p>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Próximos Eventos</h3>
            <p className="text-3xl font-bold text-blue-600">{upcomingTickets.length}</p>
          </div>

          {/* Wallet Transactions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Transacciones de Wallet</h3>
            <p className="text-3xl font-bold text-gray-900">{walletStats.transactionCount}</p>
          </div>
        </div>

        {/* Tickets by Status */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tickets por Estado</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ticketsByStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {status === 'paid'
                    ? 'Pagados'
                    : status === 'used'
                    ? 'Usados'
                    : status === 'revoked'
                    ? 'Revocados'
                    : status === 'pending_payment'
                    ? 'Pendientes'
                    : status}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/profile/tickets"
              className="px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition text-center"
            >
              Ver Todos los Tickets
            </Link>
            <Link
              href="/profile/payments"
              className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-center"
            >
              Ver Historial de Pagos
            </Link>
            <Link
              href="/profile/wallet"
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-center"
            >
              Ver Transacciones de Wallet
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

