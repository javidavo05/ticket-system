'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SecretInputProps {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
  onReveal?: () => void
}

export function SecretInput({
  value,
  onChange,
  readOnly = false,
  className,
  onReveal,
}: SecretInputProps) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleReveal = () => {
    if (!isRevealed && onReveal) {
      onReveal()
    }
    setIsRevealed(!isRevealed)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const displayValue = isRevealed ? value : '•'.repeat(Math.min(value.length, 20))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <Input
          type="text"
          value={readOnly ? displayValue : value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly || !isRevealed}
          className="font-mono text-xs pr-20"
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReveal}
          className="h-8 px-2"
        >
          {isRevealed ? (
            <EyeOff className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
        </Button>
        {isRevealed && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
