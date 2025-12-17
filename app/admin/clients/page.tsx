import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Search, Building2, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default async function ClientsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/admin/clients')
  }

  // Placeholder data - replace with actual server actions
  const clients = [
    {
      id: '1',
      email: 'client1@example.com',
      fullName: 'Cliente Empresa A',
      totalSpent: 12500,
      ticketCount: 25,
      lastPurchase: '2024-03-15',
    },
    {
      id: '2',
      email: 'client2@example.com',
      fullName: 'Cliente Empresa B',
      totalSpent: 8900,
      ticketCount: 18,
      lastPurchase: '2024-03-10',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona clientes y su historial de compras
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar clientes por email o nombre..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron clientes
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Gastado</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          fallback={client.fullName || client.email}
                          size="sm"
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {client.fullName || 'Sin nombre'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell className="font-semibold text-success-500">
                      ${client.totalSpent.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{client.ticketCount}</TableCell>
                    <TableCell>
                      {new Date(client.lastPurchase).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/clients/${client.id}`}>
                          Ver Perfil
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
