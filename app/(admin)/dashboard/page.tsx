import { getPlatformKPIs } from '@/server-actions/admin/finance/reports'

export default async function AdminDashboard() {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/dashboard/page.tsx:4',message:'Dashboard page entry',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  console.log('🔵 [DASHBOARD PAGE] Cargando página...')
  
  let kpis
  
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/dashboard/page.tsx:10',message:'Calling getPlatformKPIs',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('🔵 [DASHBOARD PAGE] Llamando getPlatformKPIs...')
    kpis = await getPlatformKPIs()
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/dashboard/page.tsx:13',message:'KPIs obtained successfully',data:{hasKpis:!!kpis},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log('✅ [DASHBOARD PAGE] KPIs obtenidos:', kpis)
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/dashboard/page.tsx:16',message:'Error in getPlatformKPIs',data:{errorMessage:error?.message,errorName:error?.name,errorStatus:error?.statusCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('❌ [DASHBOARD PAGE] Error loading KPIs:', error)
    console.error('❌ [DASHBOARD PAGE] Error message:', error.message)
    console.error('❌ [DASHBOARD PAGE] Error stack:', error.stack)
    // Return default values if there's an error
    kpis = {
      totalRevenue: 0,
      totalEvents: 0,
      totalTickets: 0,
      ticketsSold: 0,
      conversionRate: 0,
    }
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/(admin)/dashboard/page.tsx:30',message:'Dashboard page rendering',data:{hasKpis:!!kpis},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

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

