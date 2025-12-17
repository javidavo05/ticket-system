'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

const Checkbox = CheckboxPrimitive.Root

const CheckboxIndicator = CheckboxPrimitive.Indicator

const CheckboxComponent = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <Checkbox
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 dark:border-gray-700',
      'ring-offset-white dark:ring-offset-gray-900',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-primary-600 data-[state=checked]:text-white data-[state=checked]:border-primary-600',
      'dark:data-[state=checked]:bg-primary-500 dark:data-[state=checked]:border-primary-500',
      className
    )}
    {...props}
  >
    <CheckboxIndicator
      className={cn('flex items-center justify-center text-current')}
    >
      <Check className="h-4 w-4" />
    </CheckboxIndicator>
  </Checkbox>
))

CheckboxComponent.displayName = CheckboxPrimitive.Root.displayName

export { CheckboxComponent as Checkbox }
