'use client'

import { CheckCircle, Download, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils/cn'

interface Ticket {
  id: string
  ticketTypeName: string
  qrCode?: string
  downloadUrl?: string
}

interface ConfirmationProps {
  orderId: string
  paymentId: string
  tickets: Ticket[]
  total: number
  customerEmail?: string
  eventName: string
  className?: string
}

export function Confirmation({
  orderId,
  paymentId,
  tickets,
  total,
  customerEmail,
  eventName,
  className,
}: ConfirmationProps) {
  return (
    <div className={cn('max-w-2xl mx-auto space-y-6', className)}>
      {/* Success Message */}
      <Card className="border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <CheckCircle className="h-12 w-12 text-success-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ¡Compra Exitosa!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Tu orden ha sido procesada correctamente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Orden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Número de Orden</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {orderId}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">ID de Pago</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {paymentId}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Evento</p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {eventName}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Total Pagado</p>
              <p className="font-medium text-primary-600 dark:text-primary-500 text-lg">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          {customerEmail && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4" />
                <span>
                  Se envió un correo de confirmación a {customerEmail}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Tus Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tickets.map((ticket, index) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <Badge variant="outline">#{index + 1}</Badge>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {ticket.ticketTypeName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ID: {ticket.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              {ticket.downloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(ticket.downloadUrl, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/profile/tickets'}
          className="flex-1"
        >
          Ver Mis Tickets
        </Button>
        <Button
          onClick={() => window.location.href = '/'}
          className="flex-1"
        >
          Explorar Más Eventos
        </Button>
      </div>
    </div>
  )
}
