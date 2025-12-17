'use client'

import { useState } from 'react'
import { CreditCard, Wallet } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form'
import { cn } from '@/lib/utils/cn'

export type PaymentMethod = 'card' | 'wallet' | 'cashless'

interface PaymentFormProps {
  selectedMethod: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  walletBalance?: number
  total: number
  className?: string
}

export function PaymentForm({
  selectedMethod,
  onMethodChange,
  walletBalance = 0,
  total,
  className,
}: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCVC, setCardCVC] = useState('')
  const [cardName, setCardName] = useState('')

  const canUseWallet = walletBalance >= total

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <Label className="text-base font-semibold mb-4 block">
          Método de Pago
        </Label>
        <RadioGroup
          value={selectedMethod}
          onValueChange={(value) => onMethodChange(value as PaymentMethod)}
        >
          <div className="space-y-3">
            {/* Card Payment */}
            <div>
              <RadioGroupItem
                value="card"
                id="payment-card"
                className="peer sr-only"
              />
              <Label
                htmlFor="payment-card"
                className="flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 peer-data-[state=checked]:border-primary-600 dark:peer-data-[state=checked]:border-primary-500 peer-data-[state=checked]:bg-primary-50 dark:peer-data-[state=checked]:bg-primary-900/20"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      Tarjeta de Crédito/Débito
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Visa, Mastercard, Amex
                    </p>
                  </div>
                </div>
              </Label>
            </div>

            {/* Wallet Payment */}
            <div>
              <RadioGroupItem
                value="wallet"
                id="payment-wallet"
                className="peer sr-only"
                disabled={!canUseWallet}
              />
              <Label
                htmlFor="payment-wallet"
                className={cn(
                  'flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors',
                  !canUseWallet && 'opacity-50 cursor-not-allowed',
                  canUseWallet &&
                    'hover:bg-gray-50 dark:hover:bg-gray-800 peer-data-[state=checked]:border-primary-600 dark:peer-data-[state=checked]:border-primary-500 peer-data-[state=checked]:bg-primary-50 dark:peer-data-[state=checked]:bg-primary-900/20'
                )}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      Billetera Digital
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Balance: ${walletBalance.toFixed(2)}
                      {!canUseWallet && ' (insuficiente)'}
                    </p>
                  </div>
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Card Details Form */}
      {selectedMethod === 'card' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <FormField label="Nombre en la tarjeta">
              <Input
                placeholder="Juan Pérez"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </FormField>

            <FormField label="Número de tarjeta">
              <Input
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, '')
                  const formatted = value.match(/.{1,4}/g)?.join(' ') || value
                  setCardNumber(formatted.slice(0, 19))
                }}
                maxLength={19}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Vencimiento">
                <Input
                  placeholder="MM/AA"
                  value={cardExpiry}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    const formatted =
                      value.length > 2
                        ? `${value.slice(0, 2)}/${value.slice(2, 4)}`
                        : value
                    setCardExpiry(formatted.slice(0, 5))
                  }}
                  maxLength={5}
                />
              </FormField>

              <FormField label="CVC">
                <Input
                  placeholder="123"
                  value={cardCVC}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setCardCVC(value.slice(0, 4))
                  }}
                  maxLength={4}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
