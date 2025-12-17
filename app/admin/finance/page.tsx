import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/permissions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

export default async function FinancePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/admin/finance')
  }

  // Placeholder data - replace with actual server actions
  const monthlyRevenue = [
    { month: 'Enero', revenue: 125000, expenses: 45000, profit: 80000 },
    { month: 'Febrero', revenue: 189000, expenses: 62000, profit: 127000 },
    { month: 'Marzo', revenue: 152000, expenses: 48000, profit: 104000 },
  ]

  const expenseBreakdown = [
    { category: 'Marketing', amount: 25000, percentage: 35 },
    { category: 'Infraestructura', amount: 18000, percentage: 25 },
    { category: 'Personal', amount: 15000, percentage: 21 },
    { category: 'Otros', amount: 12000, percentage: 17 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Finanzas
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Análisis financiero y reportes de ingresos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ingresos Totales</p>
                <p className="text-2xl font-bold text-success-500 mt-2">
                  $466,000
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gastos Totales</p>
                <p className="text-2xl font-bold text-error-500 mt-2">
                  $155,000
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-error-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ganancia Neta</p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-500 mt-2">
                  $311,000
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary-600 dark:text-primary-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Finance */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="revenue">Ingresos</TabsTrigger>
          <TabsTrigger value="expenses">Gastos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos vs Gastos (Mensual)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Ingresos</TableHead>
                    <TableHead>Gastos</TableHead>
                    <TableHead>Ganancia</TableHead>
                    <TableHead>Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRevenue.map((row) => {
                    const margin = ((row.profit / row.revenue) * 100).toFixed(1)
                    return (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell className="text-success-500">
                          ${row.revenue.toLocaleString('es-ES')}
                        </TableCell>
                        <TableCell className="text-error-500">
                          ${row.expenses.toLocaleString('es-ES')}
                        </TableCell>
                        <TableCell className="text-primary-600 dark:text-primary-500 font-semibold">
                          ${row.profit.toLocaleString('es-ES')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={parseFloat(margin) > 50 ? 'success' : 'warning'}>
                            {margin}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Los detalles de ingresos se mostrarán aquí
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Desglose de Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Porcentaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseBreakdown.map((expense) => (
                    <TableRow key={expense.category}>
                      <TableCell className="font-medium">{expense.category}</TableCell>
                      <TableCell>${expense.amount.toLocaleString('es-ES')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full"
                              style={{ width: `${expense.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {expense.percentage}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
