'use client'

import { ArrowUp, ArrowDown, Calendar, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'

interface Transaction {
  id: string
  type: 'credit' | 'debit'
  amount: number
  balanceAfter: number
  description?: string | null
  createdAt: string
  event?: {
    id: string
    name: string
    slug: string
  } | null
}

interface TransactionListProps {
  transactions: Transaction[]
  className?: string
}

export function TransactionList({
  transactions,
  className,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No tienes transacciones aún
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Historial de Transacciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>
                    <Badge
                      variant={txn.type === 'credit' ? 'success' : 'error'}
                      className="flex items-center gap-1 w-fit"
                    >
                      {txn.type === 'credit' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {txn.type === 'credit' ? 'Crédito' : 'Débito'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {txn.description || 'Transacción'}
                      </p>
                      {txn.event && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {txn.event.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-semibold',
                        txn.type === 'credit'
                          ? 'text-success-500'
                          : 'text-error-500'
                      )}
                    >
                      {txn.type === 'credit' ? '+' : '-'}${txn.amount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ${txn.balanceAfter.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(txn.createdAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
