import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, QrCode, CheckCircle, XCircle } from 'lucide-react'

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: { eventId?: string; search?: string; status?: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/admin/tickets')
  }

  // Placeholder data - replace with actual server actions
  const tickets = [
    {
      id: '1',
      ticketNumber: 'TKT-001',
      eventName: 'Concierto Rock',
      ticketTypeName: 'General',
      customerEmail: 'customer@example.com',
      customerName: 'Juan Pérez',
      status: 'paid',
      purchaseDate: '2024-03-15',
      scanCount: 0,
    },
    {
      id: '2',
      ticketNumber: 'TKT-002',
      eventName: 'Concierto Rock',
      ticketTypeName: 'VIP',
      customerEmail: 'customer2@example.com',
      customerName: 'María García',
      status: 'used',
      purchaseDate: '2024-03-10',
      scanCount: 1,
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="success" className="flex items-center gap-1 w-fit">
            <CheckCircle className="h-3 w-3" />
            Pagado
          </Badge>
        )
      case 'used':
        return (
          <Badge variant="info" className="flex items-center gap-1 w-fit">
            <QrCode className="h-3 w-3" />
            Usado
          </Badge>
        )
      case 'revoked':
        return (
          <Badge variant="error" className="flex items-center gap-1 w-fit">
            <XCircle className="h-3 w-3" />
            Revocado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Tickets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Busca y gestiona tickets por evento
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="search"
                placeholder="Buscar por email, nombre o ID de ticket..."
                className="pl-10"
                defaultValue={searchParams.search}
              />
            </div>
            <Select defaultValue={searchParams.status || 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="used">Usado</SelectItem>
                <SelectItem value="revoked">Revocado</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full">Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron tickets
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Escaneos</TableHead>
                    <TableHead>Fecha Compra</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono font-semibold">
                        {ticket.ticketNumber}
                      </TableCell>
                      <TableCell>{ticket.eventName}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {ticket.customerName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {ticket.customerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{ticket.ticketTypeName}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>{ticket.scanCount}</TableCell>
                      <TableCell>
                        {new Date(ticket.purchaseDate).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
