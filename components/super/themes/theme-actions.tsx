'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { activateTheme, deactivateTheme } from '@/server-actions/admin/themes/activate'
import { deleteTheme } from '@/server-actions/admin/themes/delete'
import { Edit, MoreVertical, Power, Trash2, Eye, History } from 'lucide-react'

interface ThemeActionsProps {
  theme: {
    id: string
    name: string
    isActive: boolean
  }
}

export function ThemeActions({ theme }: ThemeActionsProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleActivate = async () => {
    setIsLoading(true)
    try {
      await activateTheme(theme.id)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to activate theme:', error)
      alert(error.message || 'Failed to activate theme')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivate = async () => {
    setIsLoading(true)
    try {
      await deactivateTheme(theme.id)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to deactivate theme:', error)
      alert(error.message || 'Failed to deactivate theme')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteTheme(theme.id)
      router.refresh()
      setShowDeleteDialog(false)
    } catch (error: any) {
      console.error('Failed to delete theme:', error)
      alert(error.message || 'Failed to delete theme')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/super/themes/${theme.id}`)}
          className="h-7 px-2"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push(`/super/themes/${theme.id}`)}
            >
              <Eye className="mr-2 h-3 w-3" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/super/themes/${theme.id}/versions`)}
            >
              <History className="mr-2 h-3 w-3" />
              View Versions
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {theme.isActive ? (
              <DropdownMenuItem onClick={handleDeactivate} disabled={isLoading}>
                <Power className="mr-2 h-3 w-3" />
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleActivate} disabled={isLoading}>
                <Power className="mr-2 h-3 w-3" />
                Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-error-600 dark:text-error-400"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{theme.name}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-error-600 hover:bg-error-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
