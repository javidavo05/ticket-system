'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

interface NavGroup {
  label: string
  items: NavItem[]
}

interface NavItem {
  href: string
  label: string
}

const navGroups: NavGroup[] = [
  {
    label: 'Themes',
    items: [{ href: '/super/themes', label: 'Theme Management' }],
  },
  {
    label: 'Platform',
    items: [
      { href: '/super/platform/settings', label: 'Global Settings' },
      { href: '/super/platform/limits', label: 'System Limits' },
    ],
  },
  {
    label: 'Payments',
    items: [{ href: '/super/payments/providers', label: 'Payment Providers' }],
  },
  {
    label: 'Cashless',
    items: [
      { href: '/super/cashless/settings', label: 'Wallet Settings' },
      { href: '/super/cashless/nfc', label: 'NFC Configuration' },
    ],
  },
  {
    label: 'Users',
    items: [
      { href: '/super/users/roles', label: 'Role Definitions' },
      { href: '/super/users/permissions', label: 'Permission Matrix' },
      { href: '/super/users/constraints', label: 'Role Constraints' },
    ],
  },
  {
    label: 'Events',
    items: [
      { href: '/super/events/defaults', label: 'Event Defaults' },
      { href: '/super/events/ticket-rules', label: 'Ticket Rules' },
    ],
  },
  {
    label: 'Communication',
    items: [{ href: '/super/communication/email', label: 'Email Settings' }],
  },
  {
    label: 'Audit',
    items: [{ href: '/super/audit/logs', label: 'Change Logs' }],
  },
]

export function SuperSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background-default border-b border-neutral-200 dark:border-neutral-800 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="h-8 px-2"
        >
          {isMobileOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-background-default border-r border-neutral-200 dark:border-neutral-800',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full overflow-y-auto pt-12 lg:pt-0">
          <div className="p-3">
            <div className="mb-4 px-2 py-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Platform Control
              </h2>
            </div>

            <nav className="space-y-6">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <div className="px-2 py-1 mb-1">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">
                      {group.label}
                    </h3>
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'block px-2 py-1.5 text-sm rounded',
                            'transition-colors',
                            isActive
                              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 font-medium'
                              : 'text-text-default hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          )}
                          onClick={() => setIsMobileOpen(false)}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}
