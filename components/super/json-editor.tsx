'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface JSONEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string
  className?: string
  readOnly?: boolean
}

export function JSONEditor({
  value,
  onChange,
  error,
  className,
  readOnly = false,
}: JSONEditorProps) {
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateJSON = () => {
    try {
      JSON.parse(value)
      setIsValid(true)
      setValidationError(null)
    } catch (e: any) {
      setIsValid(false)
      setValidationError(e.message || 'Invalid JSON')
    }
  }

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(value)
      const formatted = JSON.stringify(parsed, null, 2)
      onChange(formatted)
      setIsValid(true)
      setValidationError(null)
    } catch (e: any) {
      setIsValid(false)
      setValidationError(e.message || 'Invalid JSON')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isValid === true && (
            <div className="flex items-center gap-1 text-xs text-success-600 dark:text-success-400">
              <CheckCircle className="h-3 w-3" />
              <span>Valid JSON</span>
            </div>
          )}
          {isValid === false && (
            <div className="flex items-center gap-1 text-xs text-error-600 dark:text-error-400">
              <XCircle className="h-3 w-3" />
              <span>Invalid JSON</span>
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={formatJSON}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Format
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={validateJSON}
            >
              Validate
            </Button>
          </div>
        )}
      </div>

      <Textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsValid(null)
          setValidationError(null)
        }}
        readOnly={readOnly}
        className={cn(
          'font-mono text-xs',
          'min-h-[400px]',
          isValid === false && 'border-error-500',
          isValid === true && 'border-success-500'
        )}
        placeholder='{"key": "value"}'
      />

      {(error || validationError) && (
        <Alert variant="error">
          <AlertDescription className="text-xs">
            {error || validationError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
