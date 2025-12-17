'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JSONEditor } from '@/components/super/json-editor'
import { SuperFormField } from '@/components/super/form-field'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { createTheme } from '@/server-actions/admin/themes/create'
import { updateTheme } from '@/server-actions/admin/themes/update'
import type { ThemeConfig } from '@/lib/services/themes/loader'
import { defaultThemeConfig } from '@/config/theme-defaults'

interface ThemeEditorProps {
  theme?: {
    id: string
    name: string
    config: ThemeConfig
    isActive: boolean
    schemaVersion: string
  }
}

export function ThemeEditor({ theme }: ThemeEditorProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'form' | 'json'>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: theme?.name || '',
    isActive: theme?.isActive ?? true,
    config: theme?.config || defaultThemeConfig,
  })
  const [jsonValue, setJsonValue] = useState(
    JSON.stringify(formData.config, null, 2)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let config: ThemeConfig
      if (viewMode === 'json') {
        config = JSON.parse(jsonValue)
      } else {
        config = formData.config
      }

      if (theme) {
        await updateTheme(theme.id, {
          name: formData.name,
          config,
          isActive: formData.isActive,
        })
      } else {
        await createTheme({
          name: formData.name,
          config,
          isActive: formData.isActive,
        })
      }

      router.push('/super/themes')
      router.refresh()
    } catch (error: any) {
      console.error('Error saving theme:', error)
      alert(error.message || 'Failed to save theme')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuperFormField label="Theme Name" required>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="My Theme"
                className="text-sm"
              />
            </SuperFormField>

            <div className="flex items-center justify-between">
              <Label htmlFor="is-active" className="text-xs font-medium">
                Active
              </Label>
              <Switch
                id="is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
                disabled={theme?.isActive}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Config */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Theme Configuration</CardTitle>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'form' | 'json')}>
                <TabsList className="h-8">
                  <TabsTrigger value="form" className="text-xs px-3">
                    Form
                  </TabsTrigger>
                  <TabsTrigger value="json" className="text-xs px-3">
                    JSON
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'form' ? (
              <div className="space-y-4 text-sm">
                <p className="text-xs text-text-muted">
                  Form editor coming soon. Use JSON view for now.
                </p>
              </div>
            ) : (
              <JSONEditor
                value={jsonValue}
                onChange={(value) => {
                  setJsonValue(value)
                  try {
                    const parsed = JSON.parse(value)
                    setFormData({ ...formData, config: parsed })
                  } catch {
                    // Invalid JSON, keep as is
                  }
                }}
                readOnly={theme?.isActive}
              />
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !formData.name}>
            {isLoading ? 'Saving...' : theme ? 'Update Theme' : 'Create Theme'}
          </Button>
        </div>
      </div>
    </form>
  )
}
