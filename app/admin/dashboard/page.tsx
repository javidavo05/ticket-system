import { getPlatformKPIs } from '@/server-actions/admin/finance/reports'
import Link from 'next/link'
import { KPICard } from '@/components/admin/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, QrCode } from 'lucide-react'

export default async function AdminDashboard() {
  let kpis
  try {
    kpis = await getPlatformKPIs()
  } catch (error: any) {
    console.error('Error loading KPIs:', error)
    kpis = {
      totalRevenue: 0,
      totalEvents: 0,
      totalTickets: 0,
      ticketsSold: 0,
      conversionRate: 0,
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Panel de Control
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen general de la plataforma
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Ingresos Totales"
          value={`$${kpis.totalRevenue.toLocaleString('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          variant="success"
          icon={<span className="text-success-600 dark:text-success-500">$</span>}
        />
        <KPICard
          title="Total de Eventos"
          value={kpis.totalEvents}
          variant="info"
          icon={<Calendar className="h-6 w-6 text-info-600 dark:text-info-500" />}
        />
        <KPICard
          title="Tickets Vendidos"
          value={kpis.ticketsSold}
          subtitle={`de ${kpis.totalTickets} total`}
          variant="default"
          icon={<QrCode className="h-6 w-6 text-gray-600 dark:text-gray-400" />}
        />
        <KPICard
          title="Tasa de Conversión"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          variant="warning"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/events/new">
                <div className="flex flex-col items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span>Crear Evento</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/events">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>Gestionar Eventos</span>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
              <Link href="/admin/scanner">
                <div className="flex flex-col items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  <span>Escáner de Tickets</span>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

