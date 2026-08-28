import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const TONE_STYLES: Record<Tone, { bg: string; text: string; icon: string }> = {
  default: {
    bg: 'bg-[hsl(0,0%,15%)]',
    text: 'text-[hsl(0,0%,93%)]',
    icon: 'text-[hsl(0,0%,60%)]',
  },
  success: {
    bg: 'bg-[hsl(152,58%,15%)]',
    text: 'text-[hsl(152,58%,50%)]',
    icon: 'text-[hsl(152,58%,50%)]',
  },
  warning: {
    bg: 'bg-[hsl(38,90%,15%)]',
    text: 'text-[hsl(38,90%,55%)]',
    icon: 'text-[hsl(38,90%,55%)]',
  },
  danger: {
    bg: 'bg-[hsl(4,84%,18%)]',
    text: 'text-[hsl(4,84%,56%)]',
    icon: 'text-[hsl(4,84%,56%)]',
  },
  info: {
    bg: 'bg-[hsl(210,60%,15%)]',
    text: 'text-[hsl(210,60%,55%)]',
    icon: 'text-[hsl(210,60%,55%)]',
  },
}

interface DashboardMetricProps {
  label: string
  value: React.ReactNode
  icon?: ComponentType<{ className?: string }>
  tone?: Tone
  sublabel?: string
}

/** Cartão de KPI reutilizável com indicador de cor. */
export function DashboardMetric({
  label,
  value,
  icon: Icon,
  tone = 'default',
  sublabel,
}: DashboardMetricProps) {
  const styles = TONE_STYLES[tone]

  return (
    <div className={cn('flex items-center gap-4 rounded-xl border border-[hsl(0,0%,20%)] p-4', styles.bg)}>
      {Icon && (
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(0,0%,10%)]', styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[hsl(0,0%,60%)]">{label}</p>
        <p className={cn('text-xl font-bold tracking-tight', styles.text)}>{value}</p>
        {sublabel && <p className="mt-0.5 text-xs text-[hsl(0,0%,50%)]">{sublabel}</p>}
      </div>
    </div>
  )
}
