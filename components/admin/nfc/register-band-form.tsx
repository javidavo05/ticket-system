'use client'

import { useState } from 'react'
import { Form, FormField } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RegisterBandFormProps {
  onCancel?: () => void
}

export function RegisterBandForm({ onCancel }: RegisterBandFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [serialNumber, setSerialNumber] = useState('')
  const [userId, setUserId] = useState<string>('none')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Implementar server action para registrar pulsera
      console.log('Registrando pulsera:', { serialNumber, userId })
      // await registerNFCBand({ serialNumber, userId: userId === 'none' ? null : userId })
      
      // Reset form
      setSerialNumber('')
      setUserId('none')
      
      // Close dialog
      if (onCancel) {
        onCancel()
      }
    } catch (error: any) {
      console.error('Error registrando pulsera:', error)
      alert(error.message || 'Error al registrar la pulsera')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <FormField label="Número de Serie" required>
          <Input
            placeholder="NFC-XXX-XXXXXX"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            disabled={isLoading}
            required
          />
        </FormField>
        <FormField label="Asignar a Usuario">
          <Select value={userId} onValueChange={setUserId} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              <SelectItem value="user1">Juan Pérez</SelectItem>
              <SelectItem value="user2">María García</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading} loading={isLoading}>
            Registrar
          </Button>
        </div>
      </div>
    </Form>
  )
}
