'use client'

import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface BindingStepsProps {
  currentStep: 'preparing' | 'ready' | 'reading' | 'writing' | 'confirming' | 'success' | 'error'
  className?: string
}

export function BindingSteps({ currentStep, className }: BindingStepsProps) {
  const steps = [
    { key: 'preparing', label: 'Preparando', number: 1 },
    { key: 'ready', label: 'Listo', number: 1 },
    { key: 'reading', label: 'Leyendo pulsera', number: 2 },
    { key: 'writing', label: 'Escribiendo', number: 2 },
    { key: 'confirming', label: 'Confirmando', number: 3 },
    { key: 'success', label: 'Completado', number: 3 },
  ]

  const getStepStatus = (stepKey: string) => {
    const stepIndex = steps.findIndex((s) => s.key === stepKey)
    const currentIndex = steps.findIndex((s) => s.key === currentStep)

    if (stepIndex < currentIndex) {
      return 'completed'
    }
    if (stepIndex === currentIndex) {
      return 'active'
    }
    return 'pending'
  }

  const getStepNumber = () => {
    if (currentStep === 'preparing' || currentStep === 'ready') return 1
    if (currentStep === 'reading' || currentStep === 'writing') return 2
    if (currentStep === 'confirming' || currentStep === 'success') return 3
    return 1
  }

  const currentStepNumber = getStepNumber()

  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {[1, 2, 3].map((stepNum) => {
        const isCompleted = stepNum < currentStepNumber
        const isActive = stepNum === currentStepNumber
        const isLoading = isActive && ['preparing', 'reading', 'writing', 'confirming'].includes(currentStep)

        return (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  isCompleted && 'bg-success-500 border-success-500 text-white',
                  isActive && !isLoading && 'bg-primary-600 border-primary-600 text-white',
                  isActive && isLoading && 'bg-primary-100 border-primary-600 text-primary-600',
                  !isCompleted && !isActive && 'bg-gray-100 border-gray-300 text-gray-400'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="text-sm font-semibold">{stepNum}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 text-center',
                  isActive ? 'text-primary-600 font-medium' : 'text-gray-500'
                )}
              >
                Paso {stepNum}
              </span>
            </div>
            {stepNum < 3 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-2 transition-colors',
                  isCompleted ? 'bg-success-500' : 'bg-gray-300'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
