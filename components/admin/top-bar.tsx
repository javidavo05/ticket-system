'use client'

import { Bell, Search, User } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle'
import { logout } from '@/server-actions/auth/logout'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface TopBarProps {
  user?: {
    email?: string
    fullName?: string
    profilePhotoUrl?: string | null
  }
  className?: string
}

export function AdminTopBar({ user, className }: TopBarProps) {
  const router = useRouter()

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/admin/top-bar.tsx:31',message:'AdminTopBar render start',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800',
        className
      )}
    >
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <DarkModeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-error-500 rounded-full" />
          </Button>

          {/* User menu */}
          {user && (
            <DropdownMenu>
              {/* #region agent log */}
              {fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/admin/top-bar.tsx:78',message:'Rendering DropdownMenuTrigger with asChild',data:{hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{}) && null}
              {/* #endregion */}
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <span className="flex items-center gap-2">
                    <Avatar
                      src={user.profilePhotoUrl || undefined}
                      fallback={user.fullName || user.email || 'U'}
                      size="sm"
                    />
                    <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300">
                      {user.fullName || user.email}
                    </span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.fullName || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* #region agent log */}
                {fetch('http://127.0.0.1:7243/ingest/e9e7bd44-e71b-4ac3-81d9-01326533b2eb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'components/admin/top-bar.tsx:117',message:'Rendering DropdownMenuItem with asChild',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{}) && null}
                {/* #endregion */}
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Mi Perfil</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-error-500">
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
