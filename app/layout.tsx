import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Venta',
  description: 'Ticketing and cashless system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // #region agent log
  if (typeof window === 'undefined') {
    fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/layout.tsx:17',message:'RootLayout rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
  }
  // #endregion
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

