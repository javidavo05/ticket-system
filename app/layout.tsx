import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import Header from '@/components/layout/header'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { resolveAndSanitizeThemeFromRequest } from '@/lib/services/themes/resolver'
import { NextRequest } from 'next/server'
import { initializeTheme } from '@/lib/utils/dark-mode'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Tickets',
  description: 'Sistema de venta y validación de tickets',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Escáner',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Resolve theme server-side
  let themeResult
  try {
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost'
    const referer = headersList.get('referer') || `http://${host}`
    const url = new URL(referer)
    
    // Create a request object from headers for theme resolution
    const request = new NextRequest(url.toString(), {
      headers: Object.fromEntries(headersList.entries()),
    })
    themeResult = await resolveAndSanitizeThemeFromRequest(request)
  } catch (error) {
    console.error('Failed to resolve theme:', error)
    // Fallback to default theme config
    const { defaultThemeConfig } = await import('@/config/theme-defaults')
    const { sanitizeThemeConfig } = await import('@/lib/services/themes/sanitization')
    themeResult = {
      sanitizedConfig: sanitizeThemeConfig(defaultThemeConfig),
      source: 'default' as const,
    }
  }

  // Get theme color from resolved theme
  const themeColor = themeResult.sanitizedConfig.colors.primary[500] || '#000000'

  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={themeColor} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Escáner" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('dark-mode-preference');
                  const preference = stored || 'system';
                  let value = preference;
                  if (preference === 'system') {
                    value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.classList.add(value);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <ThemeProvider theme={themeResult.sanitizedConfig} source={themeResult.source}>
            <Header />
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

