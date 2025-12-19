'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, updateProfile } from '@/server-actions/user/profile'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { User, CheckCircle2, AlertCircle } from 'lucide-react'

export function ProfileSettings() {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getProfile()
        setFullName(profile.fullName || '')
        setPhone(profile.phone || '')
        setProfilePhotoUrl(profile.profilePhotoUrl || '')
        setEmail(profile.email)
      } catch (err: any) {
        showError(err.message || 'Error al cargar perfil')
      } finally {
        setLoadingData(false)
      }
    }
    loadProfile()
  }, [showError])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await updateProfile({
        fullName: fullName || undefined,
        phone: phone || undefined,
        profilePhotoUrl: profilePhotoUrl || undefined,
      })
      setSuccess(true)
      showSuccess('Perfil actualizado exitosamente')
      router.refresh()
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar perfil'
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Información del Perfil
        </CardTitle>
        <CardDescription>
          Actualiza tu información personal y de contacto
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
              Perfil actualizado exitosamente
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-gray-50 dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              El email no se puede cambiar desde aquí
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre Completo</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+507 1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profilePhotoUrl">URL de Foto de Perfil</Label>
            <Input
              id="profilePhotoUrl"
              type="url"
              value={profilePhotoUrl}
              onChange={(e) => setProfilePhotoUrl(e.target.value)}
              placeholder="https://ejemplo.com/foto.jpg"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              URL de una imagen para tu foto de perfil
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

