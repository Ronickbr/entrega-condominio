import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  className?: string
}

/** Skeleton de carregamento simples (shadcn-compatible). */
export function LoadingState({ label = 'Carregando...', className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-3 py-6', className)}>
      <div className="h-4 w-1/3 animate-pulse rounded bg-[hsl(0,0%,18%)]" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-[hsl(0,0%,18%)]" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-[hsl(0,0%,18%)]" />
      <p className="pt-2 text-center text-sm text-[hsl(0,0%,50%)]">{label}</p>
    </div>
  )
}
