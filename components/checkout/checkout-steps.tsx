'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CheckoutStepsProps {
  currentStep: number
  steps: string[]
  className?: string
}

export function CheckoutSteps({
  currentStep,
  steps,
  className,
}: CheckoutStepsProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep

          return (
            <div key={step} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isCompleted &&
                      'bg-primary-600 dark:bg-primary-500 border-primary-600 dark:border-primary-500 text-white',
                    isCurrent &&
                      'bg-primary-600 dark:bg-primary-500 border-primary-600 dark:border-primary-500 text-white',
                    !isCompleted &&
                      !isCurrent &&
                      'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{stepNumber}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center',
                    isCurrent
                      ? 'text-primary-600 dark:text-primary-500'
                      : isCompleted
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {step}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 transition-colors',
                    isCompleted
                      ? 'bg-primary-600 dark:bg-primary-500'
                      : 'bg-gray-300 dark:bg-gray-700'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
