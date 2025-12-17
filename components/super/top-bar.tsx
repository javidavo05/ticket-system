'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import { DarkModeToggle } from '@/components/ui/dark-mode-toggle'
import { logout } from '@/server-actions/auth/logout'
import { cn } from '@/lib/utils/cn'
import { LogOut, User } from 'lucide-react'

interface SuperTopBarProps {
  user?: {
    email: string
    fullName?: string | null
    profilePhotoUrl?: string | null
  }
  className?: string
}

export function SuperTopBar({ user, className }: SuperTopBarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-12 border-b border-neutral-200 dark:border-neutral-800',
        'bg-background-default',
        className
      )}
    >
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-muted">
            Super Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DarkModeToggle variant="button" />
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Avatar
                    src={user.profilePhotoUrl || undefined}
                    alt={user.fullName || user.email}
                    size="sm"
                    fallback={user.email.charAt(0).toUpperCase()}
                  />
                  <span className="ml-2 text-xs text-text-default">
                    {user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.fullName || 'User'}</p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-error-600 dark:text-error-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
