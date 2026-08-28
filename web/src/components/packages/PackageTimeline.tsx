import type { PackageEventRecord } from '@/features/packages/package.types'
import { cn } from '@/lib/utils'
import { Check, Package, Truck } from 'lucide-react'

interface PackageTimelineProps {
  events: PackageEventRecord[]
  className?: string
}

const TIMELINE_STEPS = [
  { key: 'PACKAGE_CREATED', label: 'Cadastrada', icon: Package, color: 'text-[hsl(210,60%,55%)]' },
  { key: 'PACKAGE_RECEIVED', label: 'Recebida', icon: Check, color: 'text-[hsl(38,90%,55%)]' },
  { key: 'PACKAGE_COLLECTED', label: 'Retirada', icon: Truck, color: 'text-[hsl(152,58%,50%)]' },
]

function getCompletedSteps(events: PackageEventRecord[]): Set<string> {
  const completed = new Set<string>()
  for (const event of events) {
    if (event.event_type === 'PACKAGE_CREATED' || event.event_type === 'PACKAGE_RECEIVED') {
      completed.add(event.event_type)
    }
    if (event.event_type === 'PACKAGE_COLLECTED' || event.event_type === 'PACKAGE_COLLECTED_BY_THIRD_PARTY') {
      completed.add('PACKAGE_COLLECTED')
    }
  }
  return completed
}

/** Timeline horizontal mostrando o fluxo de status da encomenda. */
export function PackageTimeline({ events, className }: PackageTimelineProps) {
  const completedSteps = getCompletedSteps(events)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {TIMELINE_STEPS.map((step) => {
        const isCompleted = completedSteps.has(step.key)
        const Icon = step.icon

        return (
          <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex w-full items-center">
              <div
                className={cn(
                  'h-2 w-full rounded-full transition-colors',
                  isCompleted ? 'bg-[hsl(152,58%,50%)]' : 'bg-[hsl(0,0%,20%)]',
                )}
              />
              {isCompleted && (
                <div
                  className={cn(
                    'absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(152,58%,50%)] ring-2 ring-[hsl(0,0%,9%)]',
                  )}
                />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Icon className={cn('h-3 w-3', isCompleted ? step.color : 'text-[hsl(0,0%,40%)]')} />
              <span
                className={cn(
                  'text-[10px] font-medium',
                  isCompleted ? 'text-[hsl(0,0%,93%)]' : 'text-[hsl(0,0%,40%)]',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
