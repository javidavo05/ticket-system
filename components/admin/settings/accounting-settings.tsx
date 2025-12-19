'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getAccountingSettings, type AccountingSettings } from '@/server-actions/admin/settings/get-accounting'
import { updateAccountingSettings } from '@/server-actions/admin/settings/update-accounting'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { DollarSign, CheckCircle2, AlertCircle } from 'lucide-react'

const CURRENCIES = [
  { value: 'USD', label: 'USD - Dólar Estadounidense' },
  { value: 'PAB', label: 'PAB - Balboa Panameño' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'CRC', label: 'CRC - Colón Costarricense' },
]

export function AccountingSettings() {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [settings, setSettings] = useState<AccountingSettings>({
    currency: 'USD',
    fiscalPeriod: 'calendar',
    reportFormat: 'pdf',
    invoiceFormat: 'standard',
    taxRate: 0,
    invoicePrefix: 'INV',
    autoGenerateInvoices: false,
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getAccountingSettings()
        setSettings(data)
      } catch (err: any) {
        showError(err.message || 'Error al cargar configuración')
      } finally {
        setLoadingData(false)
      }
    }
    loadSettings()
  }, [showError])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await updateAccountingSettings({
        currency: settings.currency,
        fiscalPeriod: settings.fiscalPeriod as 'calendar' | 'fiscal',
        reportFormat: settings.reportFormat as 'pdf' | 'excel' | 'csv',
        invoiceFormat: settings.invoiceFormat as 'standard' | 'detailed' | 'minimal',
        taxRate: settings.taxRate,
        invoicePrefix: settings.invoicePrefix,
        autoGenerateInvoices: settings.autoGenerateInvoices,
      })
      setSuccess(true)
      showSuccess('Configuración de contabilidad actualizada exitosamente')
      router.refresh()
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar configuración'
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
          <DollarSign className="h-5 w-5" />
          Configuración de Contabilidad
        </CardTitle>
        <CardDescription>
          Configura los parámetros de contabilidad y facturación
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
              Configuración actualizada exitosamente
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) =>
                  setSettings({ ...settings, currency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscalPeriod">Período Fiscal</Label>
              <Select
                value={settings.fiscalPeriod}
                onValueChange={(value: 'calendar' | 'fiscal') =>
                  setSettings({ ...settings, fiscalPeriod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar">Calendario (Enero - Diciembre)</SelectItem>
                  <SelectItem value="fiscal">Fiscal (Personalizado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportFormat">Formato de Reportes</Label>
              <Select
                value={settings.reportFormat}
                onValueChange={(value: 'pdf' | 'excel' | 'csv') =>
                  setSettings({ ...settings, reportFormat: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel (XLSX)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceFormat">Formato de Factura</Label>
              <Select
                value={settings.invoiceFormat}
                onValueChange={(value: 'standard' | 'detailed' | 'minimal') =>
                  setSettings({ ...settings, invoiceFormat: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Estándar</SelectItem>
                  <SelectItem value="detailed">Detallado</SelectItem>
                  <SelectItem value="minimal">Minimalista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tasa de Impuesto (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.taxRate || 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    taxRate: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Prefijo de Factura</Label>
              <Input
                id="invoicePrefix"
                type="text"
                value={settings.invoicePrefix || 'INV'}
                onChange={(e) =>
                  setSettings({ ...settings, invoicePrefix: e.target.value })
                }
                placeholder="INV"
                maxLength={10}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-0.5">
              <Label htmlFor="autoGenerateInvoices" className="text-base">
                Generar Facturas Automáticamente
              </Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Genera facturas automáticamente cuando se completa un pago
              </p>
            </div>
            <Switch
              id="autoGenerateInvoices"
              checked={settings.autoGenerateInvoices}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoGenerateInvoices: checked })
              }
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

