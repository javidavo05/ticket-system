import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Ticket, UserPlus, DollarSign, Search } from 'lucide-react'

export default async function PromoterPage({
  searchParams,
}: {
  searchParams: { eventId?: string; status?: string }
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/promoter')
  }

  // Placeholder data - replace with actual server actions
  const groupTickets = [
    {
      id: '1',
      ticketNumber: 'GRP-001',
      eventName: 'Concierto Rock',
      quantity: 50,
      assigned: 30,
      pending: 20,
      totalAmount: 5000,
      paidAmount: 3000,
      status: 'partial',
    },
    {
      id: '2',
      ticketNumber: 'GRP-002',
      eventName: 'Festival de Música',
      quantity: 100,
      assigned: 100,
      pending: 0,
      totalAmount: 10000,
      paidAmount: 10000,
      status: 'complete',
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge variant="success">Completo</Badge>
      case 'partial':
        return <Badge variant="warning">Parcial</Badge>
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Panel de Promotor
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona tickets grupales y asignaciones
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  150
                </p>
              </div>
              <Ticket className="h-8 w-8 text-primary-600 dark:text-primary-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Asignados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  130
                </p>
              </div>
              <UserPlus className="h-8 w-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Recaudado</p>
                <p className="text-2xl font-bold text-success-500 mt-2">
                  $13,000
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group Tickets Management */}
      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">Tickets Grupales</TabsTrigger>
          <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tickets Grupales</CardTitle>
              <Button>
                <Ticket className="h-4 w-4 mr-2" />
                Crear Grupo
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Asignados</TableHead>
                    <TableHead>Pendientes</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupTickets.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-mono font-semibold">
                        {group.ticketNumber}
                      </TableCell>
                      <TableCell>{group.eventName}</TableCell>
                      <TableCell>{group.quantity}</TableCell>
                      <TableCell className="text-success-500">
                        {group.assigned}
                      </TableCell>
                      <TableCell className="text-warning-500">
                        {group.pending}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            ${group.paidAmount.toLocaleString('es-ES')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            de ${group.totalAmount.toLocaleString('es-ES')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(group.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Gestionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones Individuales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Las asignaciones individuales se mostrarán aquí
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
