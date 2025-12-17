import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'

interface SuperFormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  description?: string
}

export function SuperFormField({
  label,
  error,
  required,
  children,
  className,
  description,
}: SuperFormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs font-medium text-text-default">
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-text-muted">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-error-600 dark:text-error-400">{error}</p>
      )}
    </div>
  )
}
