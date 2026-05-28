import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusPillVariants = cva(
  'inline-flex items-center text-xs font-medium',
  {
    variants: {
      variant: {
        neutral:  'text-gray-600',
        warning:  'rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700',
        alert:    'rounded-full bg-orange-100 px-2 py-0.5 text-orange-700',
        critical: 'rounded-full bg-red-100 px-2 py-0.5 text-red-700',
        success:  'rounded-full bg-green-100 px-2 py-0.5 text-green-800',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {}

function StatusPill({ className, variant, ...props }: StatusPillProps) {
  return <span className={cn(statusPillVariants({ variant }), className)} {...props} />
}

export { StatusPill, statusPillVariants }
