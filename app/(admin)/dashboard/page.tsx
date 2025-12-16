import { getPlatformKPIs } from '@/server-actions/admin/finance/reports'

export default async function AdminDashboard() {
  let kpis
  
  try {
    kpis = await getPlatformKPIs()
  } catch (error: any) {
    console.error('Error loading KPIs:', error)
    // Return default values if there's an error
    kpis = {
      totalRevenue: 0,
      totalEvents: 0,
      totalTickets: 0,
      ticketsSold: 0,
      conversionRate: 0,
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold">${kpis.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Events</h3>
          <p className="text-3xl font-bold">{kpis.totalEvents}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tickets Sold</h3>
          <p className="text-3xl font-bold">{kpis.ticketsSold}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Conversion Rate</h3>
          <p className="text-3xl font-bold">{kpis.conversionRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}

