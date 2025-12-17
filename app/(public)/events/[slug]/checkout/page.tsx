'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getEventBySlug } from '@/server-actions/events/list'
import { getCurrentUserAction } from '@/server-actions/auth/get-user'
import { getWalletBalance } from '@/server-actions/user/profile'
import { purchaseTickets } from '@/server-actions/tickets/purchase'
import { CheckoutSteps } from '@/components/checkout/checkout-steps'
import { TicketSummary } from '@/components/checkout/ticket-summary'
import { PaymentForm, type PaymentMethod } from '@/components/checkout/payment-form'
import { Confirmation } from '@/components/checkout/confirmation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField, Form } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils/cn'

type CheckoutStep = 'tickets' | 'payment' | 'confirmation'

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketTypeId = searchParams.get('ticketType')
  const initialQuantity = parseInt(searchParams.get('quantity') || '1')

  const [step, setStep] = useState<CheckoutStep>('tickets')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState(0)

  // Ticket selection state
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(ticketTypeId)
  const [quantity, setQuantity] = useState(initialQuantity)

  // Guest checkout state
  const [isGuest, setIsGuest] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')

  // Confirmation state
  const [orderResult, setOrderResult] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [eventData, userData] = await Promise.all([
          getEventBySlug(params.slug),
          getCurrentUserAction().catch(() => null),
        ])

        setEvent(eventData)
        setUser(userData)

        if (userData) {
          try {
            const { balance } = await getWalletBalance()
            setWalletBalance(balance)
          } catch {
            // Wallet might not exist yet
          }
        }
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.slug])

  const handleTicketSelection = () => {
    if (!selectedTicketType) {
      setError('Por favor selecciona un tipo de ticket')
      return
    }
    setStep('payment')
  }

  const handlePayment = async () => {
    if (!selectedTicketType) {
      setError('Por favor selecciona un tipo de ticket')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('eventId', event.id)
      formData.append('ticketTypeId', selectedTicketType)
      formData.append('quantity', quantity.toString())
      formData.append('paymentMethod', paymentMethod)

      if (isGuest) {
        formData.append('guestEmail', guestEmail)
        formData.append('guestName', guestName)
      }

      const result = await purchaseTickets(formData)

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
      } else if (result.paymentUrl) {
        window.location.href = result.paymentUrl
      } else {
        setOrderResult(result)
        setStep('confirmation')
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar la compra')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Evento no encontrado</AlertDescription>
        </Alert>
      </div>
    )
  }

  const ticketTypes = Array.isArray(event.ticket_types)
    ? event.ticket_types
    : event.ticket_types
    ? [event.ticket_types]
    : []

  const selectedType = ticketTypes.find((tt: any) => tt.id === selectedTicketType)
  const unitPrice = selectedType ? parseFloat(String(selectedType.price)) : 0
  const subtotal = unitPrice * quantity
  const total = subtotal

  const steps = ['Tickets', 'Pago', 'Confirmación']

  if (step === 'confirmation' && orderResult) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <Confirmation
            orderId={orderResult.orderId || 'N/A'}
            paymentId={orderResult.paymentId || 'N/A'}
            tickets={orderResult.tickets || []}
            total={total}
            customerEmail={isGuest ? guestEmail : user?.email}
            eventName={event.name}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Steps Indicator */}
          <div className="mb-8">
            <CheckoutSteps
              currentStep={step === 'tickets' ? 1 : step === 'payment' ? 2 : 3}
              steps={steps}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {step === 'tickets' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Seleccionar Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ticketTypes.length === 0 ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No hay tipos de tickets disponibles
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        {ticketTypes.map((ticketType: any) => {
                          const available =
                            ticketType.quantity_available - ticketType.quantity_sold
                          const isSelected = selectedTicketType === ticketType.id

                          return (
                            <div
                              key={ticketType.id}
                              className={cn(
                                'p-4 border-2 rounded-lg cursor-pointer transition-colors',
                                isSelected
                                  ? 'border-primary-600 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                              )}
                              onClick={() => setSelectedTicketType(ticketType.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() =>
                                        setSelectedTicketType(
                                          isSelected ? null : ticketType.id
                                        )
                                      }
                                    />
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                      {ticketType.name}
                                    </h3>
                                  </div>
                                  {ticketType.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                      {ticketType.description}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-500 dark:text-gray-500">
                                    {available} disponible{available !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-500">
                                    ${parseFloat(String(ticketType.price)).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {selectedTicketType && (
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <FormField label="Cantidad">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  max={
                                    selectedType
                                      ? selectedType.quantity_available -
                                        selectedType.quantity_sold
                                      : 1
                                  }
                                  value={quantity}
                                  onChange={(e) =>
                                    setQuantity(
                                      Math.max(
                                        1,
                                        Math.min(
                                          selectedType
                                            ? selectedType.quantity_available -
                                              selectedType.quantity_sold
                                            : 1,
                                          parseInt(e.target.value) || 1
                                        )
                                      )
                                    )
                                  }
                                  className="w-20 text-center"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setQuantity(
                                      Math.min(
                                        selectedType
                                          ? selectedType.quantity_available -
                                            selectedType.quantity_sold
                                          : 1,
                                        quantity + 1
                                      )
                                    )
                                  }
                                >
                                  +
                                </Button>
                              </div>
                            </FormField>
                          </div>
                        )}

                        {/* Guest Checkout */}
                        {!user && (
                          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="guest-checkout"
                                checked={isGuest}
                                onCheckedChange={(checked) =>
                                  setIsGuest(checked === true)
                                }
                              />
                              <Label htmlFor="guest-checkout" className="cursor-pointer">
                                Comprar como invitado
                              </Label>
                            </div>

                            {isGuest && (
                              <>
                                <FormField label="Email" required>
                                  <Input
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    required={isGuest}
                                  />
                                </FormField>

                                <FormField label="Nombre completo" required>
                                  <Input
                                    type="text"
                                    placeholder="Juan Pérez"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    required={isGuest}
                                  />
                                </FormField>
                              </>
                            )}
                          </div>
                        )}

                        {error && (
                          <Alert variant="error">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}

                        <Button
                          onClick={handleTicketSelection}
                          disabled={!selectedTicketType || quantity <= 0}
                          className="w-full"
                          size="lg"
                        >
                          Continuar al Pago
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {step === 'payment' && (
                <>
                  <PaymentForm
                    selectedMethod={paymentMethod}
                    onMethodChange={setPaymentMethod}
                    walletBalance={walletBalance}
                    total={total}
                  />

                  {error && (
                    <Alert variant="error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep('tickets')}
                      className="flex-1"
                    >
                      Volver
                    </Button>
                    <Button
                      onClick={handlePayment}
                      disabled={processing}
                      className="flex-1"
                      size="lg"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        `Pagar $${total.toFixed(2)}`
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-1">
              <TicketSummary
                items={
                  selectedType
                    ? [
                        {
                          ticketTypeId: selectedType.id,
                          ticketTypeName: selectedType.name,
                          quantity,
                          unitPrice,
                          subtotal,
                        },
                      ]
                    : []
                }
                subtotal={subtotal}
                total={total}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


