import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Search, UserPlus, Shield } from 'lucide-react'
import Link from 'next/link'

export default async function UsersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/admin/users')
  }

  // Placeholder data - replace with actual server actions
  const users = [
    {
      id: '1',
      email: 'user1@example.com',
      fullName: 'Juan Pérez',
      role: 'user',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'super_admin',
      createdAt: '2024-01-10',
    },
  ]

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="error">Super Admin</Badge>
      case 'event_admin':
        return <Badge variant="info">Admin Evento</Badge>
      case 'scanner':
        return <Badge variant="warning">Escáner</Badge>
      default:
        return <Badge variant="outline">Usuario</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona usuarios y permisos
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
            <UserPlus className="h-4 w-4 mr-2" />
            Agregar Usuario
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="search"
                placeholder="Buscar por email o nombre..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Filtrar por Rol
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron usuarios
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          fallback={user.fullName || user.email}
                          size="sm"
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {user.fullName || 'Sin nombre'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${user.id}`}>
                          Ver Detalles
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
