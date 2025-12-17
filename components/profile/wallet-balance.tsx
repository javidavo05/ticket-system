'use client'

import { useState } from 'react'
import { Wallet, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { FormField, Form } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface WalletBalanceProps {
  balance: number
  onReload?: (amount: number) => Promise<void>
  className?: string
}

export function WalletBalance({
  balance,
  onReload,
  className,
}: WalletBalanceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Por favor ingresa un monto válido')
      return
    }

    if (amountNum < 10) {
      setError('El monto mínimo es $10.00')
      return
    }

    setLoading(true)
    try {
      if (onReload) {
        await onReload(amountNum)
        setIsOpen(false)
        setAmount('')
      }
    } catch (err: any) {
      setError(err.message || 'Error al recargar la billetera')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary-600 dark:text-primary-500" />
            Balance de Billetera
          </CardTitle>
          {onReload && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Recargar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Recargar Billetera</DialogTitle>
                </DialogHeader>
                <Form onSubmit={handleReload}>
                  <div className="space-y-4">
                    <FormField label="Monto a recargar" required>
                      <Input
                        type="number"
                        min="10"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        leftIcon={<span className="text-gray-500">$</span>}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Monto mínimo: $10.00
                      </p>
                    </FormField>

                    {error && (
                      <div className="text-sm text-error-500">{error}</div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        loading={loading}
                        className="flex-1"
                      >
                        Recargar
                      </Button>
                    </div>
                  </div>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-4xl font-bold text-primary-600 dark:text-primary-500 mb-2">
            ${balance.toFixed(2)}
          </p>
          <Badge variant="success" className="text-sm">
            Disponible
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
