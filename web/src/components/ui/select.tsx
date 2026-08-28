import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Select nativo estilizado (sem dependências radix extras).
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'flex h-9 w-full appearance-none rounded-md border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,13%)] px-3 py-1 text-sm text-[hsl(0,0%,93%)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(4,84%,56%)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,60%)] opacity-50" />
  </div>
))
Select.displayName = 'Select'

export { Select }
