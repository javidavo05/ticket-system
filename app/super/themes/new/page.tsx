import { requireSuperAdmin } from '@/lib/auth/permissions'
import { ThemeEditor } from '@/components/super/themes/theme-editor'

export default async function NewThemePage() {
  await requireSuperAdmin()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Create Theme</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Create a new platform theme
        </p>
      </div>

      <ThemeEditor />
    </div>
  )
}
