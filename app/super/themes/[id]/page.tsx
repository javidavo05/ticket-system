import { requireSuperAdmin } from '@/lib/auth/permissions'
import { getThemeById } from '@/server-actions/admin/themes/get'
import { notFound } from 'next/navigation'
import { ThemeEditor } from '@/components/super/themes/theme-editor'
import { ThemeAssignments } from '@/components/super/themes/theme-assignments'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function ThemeEditPage({
  params,
}: {
  params: { id: string }
}) {
  await requireSuperAdmin()

  let theme
  try {
    theme = await getThemeById(params.id)
  } catch (error) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-default">Edit Theme</h1>
        <p className="text-xs text-text-muted mt-0.5">{theme.name}</p>
      </div>

      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="editor">
          <ThemeEditor theme={theme} />
        </TabsContent>
        <TabsContent value="assignments">
          <ThemeAssignments themeId={theme.id} assignments={theme.assignments} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
