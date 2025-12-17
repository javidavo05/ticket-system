import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default async function DiscountsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/admin/discounts')
  }

  // Placeholder data - replace with actual server actions
  const discounts = [
    {
      id: '1',
      code: 'SUMMER2024',
      type: 'percentage',
      value: 20,
      usageCount: 45,
      maxUsage: 100,
      validFrom: '2024-01-01',
      validUntil: '2024-12-31',
      status: 'active',
    },
    {
      id: '2',
      code: 'WELCOME10',
      type: 'fixed',
      value: 10,
      usageCount: 120,
      maxUsage: 200,
      validFrom: '2024-01-01',
      validUntil: '2024-06-30',
      status: 'active',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Descuentos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona códigos de descuento y promociones
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/discounts/new">
            <Plus className="h-4 w-4 mr-2" />
            Crear Descuento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Códigos de Descuento</CardTitle>
        </CardHeader>
        <CardContent>
          {discounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No hay descuentos disponibles
              </p>
              <Button asChild>
                <Link href="/admin/discounts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Descuento
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Válido Hasta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-mono font-semibold">
                      {discount.code}
                    </TableCell>
                    <TableCell>
                      {discount.type === 'percentage' ? 'Porcentaje' : 'Fijo'}
                    </TableCell>
                    <TableCell>
                      {discount.type === 'percentage'
                        ? `${discount.value}%`
                        : `$${discount.value}`}
                    </TableCell>
                    <TableCell>
                      {discount.usageCount} / {discount.maxUsage}
                    </TableCell>
                    <TableCell>
                      {new Date(discount.validUntil).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          discount.status === 'active' ? 'success' : 'outline'
                        }
                      >
                        {discount.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/discounts/${discount.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-error-500" />
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
