import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[hsl(0,0%,93%)]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[hsl(0,0%,60%)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
