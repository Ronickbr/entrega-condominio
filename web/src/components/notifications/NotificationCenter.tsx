import { memo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AlarmClock,
  AlertCircle,
  BellOff,
  CheckCheck,
  Handshake,
  Info,
  PackageCheck,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationBadge } from '@/components/notifications/NotificationBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { timeAgo } from '@/lib/utils'
import type { NotificationRecord } from '@/features/notifications/notification.service'

function typeIcon(type: string) {
  switch (type) {
    case 'PACKAGE_RECEIVED':
      return PackageCheck
    case 'PACKAGE_REMINDER':
      return AlarmClock
    case 'PACKAGE_COLLECTED':
      return Handshake
    case 'ERROR':
      return AlertCircle
    default:
      return Info
  }
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationRecord
  onMarkRead: (id: string) => void
}) {
  const Icon = typeIcon(notification.type)
  const handleMarkRead = useCallback(() => {
    void onMarkRead(notification.id)
  }, [notification.id, onMarkRead])

  return (
    <DropdownMenuItem asChild className="cursor-pointer" onSelect={handleMarkRead}>
      <Link to="/notificacoes" className="items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium">{notification.title}</span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>
          <span className="text-[10px] text-muted-foreground/70">{timeAgo(notification.created_at)}</span>
        </span>
      </Link>
    </DropdownMenuItem>
  )
})

export const NotificationCenter = memo(function NotificationCenter() {
  const { items, unread, markRead, markAllRead } = useNotifications()

  const handleMarkAllRead = useCallback(() => {
    void markAllRead()
  }, [markAllRead])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <NotificationBadge count={unread} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="px-0">Notificações</DropdownMenuLabel>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4" />
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <BellOff className="h-8 w-8 opacity-40" />
            Nenhuma notificação não lida.
          </div>
        ) : (
          items.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notificacoes" className="justify-center text-center text-sm font-medium">
            Ver todas as notificações
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
