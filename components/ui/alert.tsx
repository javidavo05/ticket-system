'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-gray-950 dark:[&>svg]:text-gray-50',
  {
    variants: {
      variant: {
        default:
          'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700',
        success:
          'bg-success-50 dark:bg-success-900/20 text-success-900 dark:text-success-100 border-success-200 dark:border-success-800',
        error:
          'bg-error-50 dark:bg-error-900/20 text-error-900 dark:text-error-100 border-error-200 dark:border-error-800',
        warning:
          'bg-warning-50 dark:bg-warning-900/20 text-warning-900 dark:text-warning-100 border-warning-200 dark:border-warning-800',
        info: 'bg-info-50 dark:bg-info-900/20 text-info-900 dark:text-info-100 border-info-200 dark:border-info-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Alert = ({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) => (
  <div
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
)
Alert.displayName = 'Alert'

const AlertTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
)
AlertDescription.displayName = 'AlertDescription'

interface AlertWithDismissProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  onDismiss?: () => void
  title?: string
  description?: string
}

const AlertWithDismiss = ({
  className,
  variant,
  onDismiss,
  title,
  description,
  children,
  ...props
}: AlertWithDismissProps) => (
  <Alert variant={variant} className={cn('pr-10', className)} {...props}>
    {title && <AlertTitle>{title}</AlertTitle>}
    {description && <AlertDescription>{description}</AlertDescription>}
    {children}
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="absolute right-4 top-4 rounded-md p-1 text-current opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </Alert>
)

export { Alert, AlertTitle, AlertDescription, AlertWithDismiss, alertVariants }
