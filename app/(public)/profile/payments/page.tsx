import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import { getUserPayments, getPaymentCount } from '@/server-actions/user/payments'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/profile/payments')
  }

  // Super admins no tienen cuenta de tickets - redirigir a admin dashboard
  const isSuper = await isSuperAdmin(user.id)
  if (isSuper) {
    redirect('/admin/dashboard')
  }

  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const [payments, totalCount] = await Promise.all([
    getUserPayments(limit, offset),
    getPaymentCount(),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'refunded':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado'
      case 'failed':
        return 'Fallido'
      case 'processing':
        return 'Procesando'
      case 'pending':
        return 'Pendiente'
      case 'refunded':
        return 'Reembolsado'
      default:
        return status
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Historial de Pagos</h1>
          <p className="text-gray-600 mt-2">Total: {totalCount} pagos</p>
        </div>

        {payments.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No tienes pagos registrados</p>
            <Link
              href="/events"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Ver Eventos Disponibles
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white shadow rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        ${payment.amount.toFixed(2)} {payment.currency}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Proveedor:</span> {payment.provider}
                      </p>
                      <p>
                        <span className="font-medium">Método:</span> {payment.paymentMethod}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span>{' '}
                        {format(new Date(payment.createdAt), 'PPP p')}
                      </p>
                      {payment.amountPaid < payment.amount && (
                        <p>
                          <span className="font-medium">Pagado:</span> ${payment.amountPaid.toFixed(2)} / ${payment.amount.toFixed(2)}
                        </p>
                      )}
                      {payment.items && payment.items.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Items:</span>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            {payment.items.map((item: any, idx: number) => (
                              <li key={idx} className="text-xs">
                                {item.item_type === 'ticket' && item.tickets && (
                                  <>
                                    {Array.isArray(item.tickets) ? item.tickets[0]?.ticket_number : item.tickets?.ticket_number} -{' '}
                                    {Array.isArray(item.tickets) 
                                      ? Array.isArray(item.tickets[0]?.events) 
                                        ? item.tickets[0]?.events[0]?.name 
                                        : item.tickets[0]?.events?.name
                                      : Array.isArray(item.tickets?.events)
                                      ? item.tickets?.events[0]?.name
                                      : item.tickets?.events?.name}
                                  </>
                                )}
                                {item.item_type !== 'ticket' && `${item.item_type}: $${parseFloat(item.amount as string).toFixed(2)}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
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
                href={`/profile/payments?page=${page - 1}`}
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
                href={`/profile/payments?page=${page + 1}`}
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

