import { getCurrentUser } from '@/lib/auth/permissions'
import { getProfile } from '@/server-actions/user/profile'
import Link from 'next/link'
import UserNav from './user-nav'
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle'

export default async function Header() {
  const user = await getCurrentUser()
  let profile = null

  if (user) {
    try {
      profile = await getProfile()
    } catch (error) {
      // If profile fetch fails, user will see login button
      console.error('Error fetching profile for header:', error)
    }
  }

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and main navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
                Sistema de Tickets
              </h1>
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link
                href="/events"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Eventos
              </Link>
              {user && (
                <Link
                  href="/profile"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Mi Perfil
                </Link>
              )}
            </nav>
          </div>

          {/* User actions */}
          <div className="flex items-center space-x-4">
            <DarkModeToggle />
            {user && profile ? (
              <UserNav
                user={{
                  email: profile.email,
                  fullName: profile.fullName,
                  profilePhotoUrl: profile.profilePhotoUrl,
                }}
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-600 dark:bg-primary-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

