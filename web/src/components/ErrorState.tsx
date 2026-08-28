import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  action?: ReactNode
}

/** Estado de erro amigável (sem código/stack cru). */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Ocorreu um erro ao buscar os dados. Tente novamente.',
  action,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <TriangleAlert className="h-8 w-8 text-[hsl(4,84%,56%)]" />
      <p className="font-medium text-[hsl(0,0%,93%)]">{title}</p>
      <p className="max-w-sm text-sm text-[hsl(0,0%,60%)]">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
