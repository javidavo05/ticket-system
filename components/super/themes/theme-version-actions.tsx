'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
import { rollbackThemeVersion } from '@/server-actions/admin/themes/rollback'
import { RotateCcw } from 'lucide-react'

interface ThemeVersionActionsProps {
  themeId: string
  version: {
    id: string
    version: number
  }
  currentVersion: number
}

export function ThemeVersionActions({
  themeId,
  version,
  currentVersion,
}: ThemeVersionActionsProps) {
  const router = useRouter()
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRollback = async () => {
    setIsLoading(true)
    try {
      await rollbackThemeVersion(themeId, version.version)
      router.refresh()
      setShowRollbackDialog(false)
    } catch (error: any) {
      console.error('Failed to rollback theme:', error)
      alert(error.message || 'Failed to rollback theme')
    } finally {
      setIsLoading(false)
    }
  }

  const canRollback = version.version < currentVersion

  if (!canRollback) {
    return (
      <span className="text-xs text-text-muted">Current</span>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowRollbackDialog(true)}
        className="h-7 px-2 text-xs"
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Rollback
      </Button>

      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Theme Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback to version {version.version}? This
              will create a new version based on the selected version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollback}
              disabled={isLoading}
            >
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
