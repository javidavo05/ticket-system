'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getAdminPreferences, type AdminPreferences } from '@/server-actions/admin/settings/get-preferences'
import { updateAdminPreferences } from '@/server-actions/admin/settings/update-preferences'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { Settings, CheckCircle2, AlertCircle, Globe, Clock, Bell, Palette } from 'lucide-react'

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
]

const TIMEZONES = [
  { value: 'America/Panama', label: 'Panamá (UTC-5)' },
  { value: 'America/Mexico_City', label: 'México (UTC-6)' },
  { value: 'America/Bogota', label: 'Colombia (UTC-5)' },
  { value: 'America/Lima', label: 'Perú (UTC-5)' },
  { value: 'America/Santiago', label: 'Chile (UTC-3)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'UTC', label: 'UTC' },
]

export function PreferencesSettings() {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [preferences, setPreferences] = useState<AdminPreferences>({
    language: 'es',
    timezone: 'America/Panama',
    notifications: {
      email: true,
      push: false,
      events: true,
      payments: true,
      reports: true,
    },
    theme: 'system',
  })

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const data = await getAdminPreferences()
        setPreferences(data)
      } catch (err: any) {
        showError(err.message || 'Error al cargar preferencias')
      } finally {
        setLoadingData(false)
      }
    }
    loadPreferences()
  }, [showError])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await updateAdminPreferences(preferences)
      setSuccess(true)
      showSuccess('Preferencias actualizadas exitosamente')
      router.refresh()
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar preferencias'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferencias Generales
          </CardTitle>
          <CardDescription>
            Personaliza tu experiencia en el panel de administración
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Preferencias actualizadas exitosamente
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Idioma
                </Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, language: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Zona Horaria
                </Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, timezone: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Tema
                </Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: 'light' | 'dark' | 'system') =>
                    setPreferences({ ...preferences, theme: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Sistema</SelectItem>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Notificaciones
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-email">Notificaciones por Email</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Recibe notificaciones importantes por correo electrónico
                    </p>
                  </div>
                  <Switch
                    id="notif-email"
                    checked={preferences.notifications.email}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, email: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-push">Notificaciones Push</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Recibe notificaciones en tiempo real (requiere permisos del navegador)
                    </p>
                  </div>
                  <Switch
                    id="notif-push"
                    checked={preferences.notifications.push}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, push: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-events">Notificaciones de Eventos</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Recibe alertas sobre cambios en eventos
                    </p>
                  </div>
                  <Switch
                    id="notif-events"
                    checked={preferences.notifications.events}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, events: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-payments">Notificaciones de Pagos</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Recibe alertas sobre transacciones y pagos
                    </p>
                  </div>
                  <Switch
                    id="notif-payments"
                    checked={preferences.notifications.payments}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, payments: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notif-reports">Notificaciones de Reportes</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Recibe alertas cuando se generen reportes importantes
                    </p>
                  </div>
                  <Switch
                    id="notif-reports"
                    checked={preferences.notifications.reports}
                    onCheckedChange={(checked) =>
                      setPreferences({
                        ...preferences,
                        notifications: { ...preferences.notifications, reports: checked },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Preferencias'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

