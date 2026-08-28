import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  className?: string
}

/**
 * Bell + contador de não lidas. Com contagem, exibe o número em badge
 * primário; sem contagem, um ponto indicador discreto.
 */
export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  return (
    <span className={cn('relative flex h-9 w-9 items-center justify-center', className)}>
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
          aria-label={`${count} notificação${count !== 1 ? 's' : ''} não lida${count !== 1 ? 's' : ''}`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  )
}
