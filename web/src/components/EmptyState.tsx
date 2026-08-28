import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: ReactNode
}

/** Estado vazio padronizado. */
export function EmptyState({
  title = 'Nada por aqui',
  description = 'Nenhum registro encontrado.',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox className="h-8 w-8 text-[hsl(0,0%,40%)]" />
      <p className="font-medium text-[hsl(0,0%,93%)]">{title}</p>
      <p className="max-w-sm text-sm text-[hsl(0,0%,60%)]">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
