import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { isSuperAdmin } from '@/lib/supabase/rls'
import { getWalletTransactions, getWalletStats } from '@/server-actions/user/wallet'
import { getWalletBalance } from '@/server-actions/user/profile'
import Link from 'next/link'
import { WalletBalance } from '@/components/profile/wallet-balance'
import { TransactionList } from '@/components/profile/transaction-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function WalletPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/profile/wallet')
  }

  // Super admins no tienen cuenta de tickets - redirigir a super admin panel
  const isSuper = await isSuperAdmin(user.id)
  if (isSuper) {
    redirect('/super')
  }

  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const [transactions, stats, walletData] = await Promise.all([
    getWalletTransactions(limit, offset),
    getWalletStats(),
    getWalletBalance().catch(() => ({ balance: 0 })),
  ])

  const totalPages = Math.ceil(stats.transactionCount / limit)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/profile"
              className="text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-600 text-sm font-medium flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Perfil
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Mi Billetera Digital
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Balance & Stats */}
          <div className="lg:col-span-1 space-y-6">
            <WalletBalance balance={walletData.balance} />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Créditos
                  </p>
                  <p className="text-2xl font-bold text-success-500">
                    ${stats.totalCredits.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Débitos
                  </p>
                  <p className="text-2xl font-bold text-error-500">
                    ${stats.totalDebits.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Transacciones
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.transactionCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions */}
          <div className="lg:col-span-2">
            <TransactionList transactions={transactions} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-2">
                {page > 1 && (
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href={`/profile/wallet?page=${page - 1}`}>
                      Anterior
                    </Link>
                  </Button>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Página {page} de {totalPages}
                </span>
                {page < totalPages && (
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href={`/profile/wallet?page=${page + 1}`}>
                      Siguiente
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

