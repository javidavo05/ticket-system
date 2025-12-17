import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RegisterBandDialog } from '@/components/admin/nfc/register-band-dialog'
import { Plus, Wallet, User, Search } from 'lucide-react'

export default async function NFCManagementPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/admin/nfc')
  }

  // Placeholder data - replace with actual server actions
  const nfcBands = [
    {
      id: '1',
      serialNumber: 'NFC-001-ABC123',
      userId: 'user-1',
      userName: 'Juan Pérez',
      userEmail: 'juan@example.com',
      status: 'active',
      registeredAt: '2024-01-15',
    },
    {
      id: '2',
      serialNumber: 'NFC-002-XYZ789',
      userId: null,
      userName: null,
      userEmail: null,
      status: 'unassigned',
      registeredAt: '2024-01-20',
    },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Activa</Badge>
      case 'unassigned':
        return <Badge variant="outline">Sin Asignar</Badge>
      case 'suspended':
        return <Badge variant="error">Suspendida</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Gestión NFC
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Registra y gestiona pulseras NFC
          </p>
        </div>
        <div className="flex gap-2">
          <RegisterBandDialog />
          <Button
            asChild
            variant="outline"
          >
            <a href="/admin/nfc/bind">
              <Plus className="h-4 w-4 mr-2" />
              Vincular con NFC
            </a>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar por número de serie o usuario..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* NFC Bands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pulseras NFC Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {nfcBands.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No hay pulseras registradas
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primera Pulsera
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Serie</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfcBands.map((band) => (
                  <TableRow key={band.id}>
                    <TableCell className="font-mono font-semibold">
                      {band.serialNumber}
                    </TableCell>
                    <TableCell>
                      {band.userName ? (
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {band.userName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {band.userEmail}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">
                          Sin asignar
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(band.status)}</TableCell>
                    <TableCell>
                      {new Date(band.registeredAt).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {band.status === 'unassigned' && (
                          <Button variant="ghost" size="sm">
                            <User className="h-4 w-4 mr-1" />
                            Asignar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          Ver Detalles
                        </Button>
                      </div>
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
