import { cn } from '@/lib/utils/cn'
import {
  Table as BaseTable,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table'

interface SuperTableProps extends React.HTMLAttributes<HTMLTableElement> {
  dense?: boolean
}

export function SuperTable({ className, dense = true, ...props }: SuperTableProps) {
  return (
    <BaseTable
      className={cn(
        dense && 'text-sm',
        className
      )}
      {...props}
    />
  )
}

export const SuperTableHeader = TableHeader
export const SuperTableBody = TableBody
export const SuperTableFooter = TableFooter
export const SuperTableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <TableHead
    className={cn(
      'px-2 py-1.5 text-xs font-semibold uppercase tracking-wider',
      className
    )}
    {...props}
  />
)
export const SuperTableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <TableRow
    className={cn(
      'hover:bg-neutral-50 dark:hover:bg-neutral-900/50',
      className
    )}
    {...props}
  />
)
export const SuperTableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <TableCell
    className={cn(
      'px-2 py-1.5',
      className
    )}
    {...props}
  />
)
export const SuperTableCaption = TableCaption
