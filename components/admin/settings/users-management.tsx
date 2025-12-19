'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { listUsers, type UserListItem } from '@/server-actions/admin/users/list'
import { createUser } from '@/server-actions/admin/users/create'
import { updateUser } from '@/server-actions/admin/users/update'
import { deleteUser } from '@/server-actions/admin/users/delete'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { Users, UserPlus, Search, Edit, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { ROLES } from '@/lib/utils/constants'

const ROLE_LABELS: Record<string, string> = {
  event_admin: 'Admin Evento',
  accounting: 'Contabilidad',
  scanner: 'Escáner',
  promoter: 'Promotor',
  super_admin: 'Super Admin',
}

export function UsersManagement() {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [users, setUsers] = useState<UserListItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'event_admin' as 'event_admin' | 'accounting' | 'scanner' | 'promoter',
  })

  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    roles: [] as string[],
    isActive: true,
  })

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, roleFilter])

  const loadUsers = async () => {
    setLoadingData(true)
    try {
      const result = await listUsers({
        search: search || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        page: currentPage,
        limit: 20,
      })
      setUsers(result.users)
      setTotalPages(result.totalPages)
    } catch (err: any) {
      showError(err.message || 'Error al cargar usuarios')
    } finally {
      setLoadingData(false)
    }
  }

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createUser(createForm)
      showSuccess('Usuario creado exitosamente')
      setCreateModalOpen(false)
      setCreateForm({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: 'event_admin',
      })
      loadUsers()
    } catch (err: any) {
      showError(err.message || 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: UserListItem) => {
    setSelectedUser(user)
    setEditForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      roles: user.roles,
      isActive: user.isActive,
    })
    setEditModalOpen(true)
  }

  const handleUpdateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedUser) return

    setLoading(true)

    try {
      await updateUser(selectedUser.id, {
        fullName: editForm.fullName || undefined,
        phone: editForm.phone || undefined,
        roles: editForm.roles as any,
        isActive: editForm.isActive,
      })
      showSuccess('Usuario actualizado exitosamente')
      setEditModalOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (err: any) {
      showError(err.message || 'Error al actualizar usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setLoading(true)

    try {
      await deleteUser(userToDelete, false)
      showSuccess('Usuario desactivado exitosamente')
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (err: any) {
      showError(err.message || 'Error al eliminar usuario')
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = (role: string) => {
    setEditForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Crea, edita y gestiona usuarios del sistema
              </CardDescription>
            </div>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent size="lg">
                <form onSubmit={handleCreateUser}>
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Completa la información para crear un nuevo usuario
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-email">Email *</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, email: e.target.value })
                        }
                        required
                        placeholder="usuario@ejemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-password">Contraseña *</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={createForm.password}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, password: e.target.value })
                        }
                        required
                        minLength={8}
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-fullName">Nombre Completo</Label>
                      <Input
                        id="create-fullName"
                        type="text"
                        value={createForm.fullName}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, fullName: e.target.value })
                        }
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-phone">Teléfono</Label>
                      <Input
                        id="create-phone"
                        type="tel"
                        value={createForm.phone}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, phone: e.target.value })
                        }
                        placeholder="+507 1234-5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-role">Rol *</Label>
                      <Select
                        value={createForm.role}
                        onValueChange={(value: any) =>
                          setCreateForm({ ...createForm, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="event_admin">Admin Evento</SelectItem>
                          <SelectItem value="accounting">Contabilidad</SelectItem>
                          <SelectItem value="scanner">Escáner</SelectItem>
                          <SelectItem value="promoter">Promotor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creando...' : 'Crear Usuario'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar por email o nombre..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="event_admin">Admin Evento</SelectItem>
                <SelectItem value="accounting">Contabilidad</SelectItem>
                <SelectItem value="scanner">Escáner</SelectItem>
                <SelectItem value="promoter">Promotor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron usuarios
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Estado</TableHead>
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
                            src={user.profilePhotoUrl || undefined}
                            size="sm"
                          />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {user.fullName || 'Sin nombre'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="outline">
                              {ROLE_LABELS[role] || role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'success' : 'outline'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserToDelete(user.id)
                              setDeleteConfirmOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-error-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent size="lg">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Actualiza la información del usuario
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser?.email || ''}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500">El email no se puede cambiar</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Nombre Completo</Label>
                <Input
                  id="edit-fullName"
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fullName: e.target.value })
                  }
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Teléfono</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  placeholder="+507 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="space-y-2">
                  {['event_admin', 'accounting', 'scanner', 'promoter'].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={editForm.roles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <Label
                        htmlFor={`role-${role}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {ROLE_LABELS[role]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-active"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isActive: checked as boolean })
                  }
                />
                <Label htmlFor="edit-active" className="text-sm font-normal cursor-pointer">
                  Usuario activo
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas desactivar este usuario? El usuario no podrá
              acceder al sistema pero sus datos se mantendrán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setUserToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteUser}
              disabled={loading}
              className="bg-error-500 hover:bg-error-600 text-white"
            >
              {loading ? 'Eliminando...' : 'Desactivar Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

