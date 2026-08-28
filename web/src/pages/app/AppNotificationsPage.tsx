import { useEffect, useState } from 'react'
import {
  AlarmClock,
  AlertCircle,
  Bell,
  CheckCheck,
  Handshake,
  Info,
  Loader2,
  PackageCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/utils'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '@/features/notifications/notification.service'

const TYPE_ICONS: Record<string, { icon: typeof Info; label: string }> = {
  PACKAGE_RECEIVED: { icon: PackageCheck, label: 'Recebimento' },
  PACKAGE_REMINDER: { icon: AlarmClock, label: 'Lembrete' },
  PACKAGE_COLLECTED: { icon: Handshake, label: 'Retirada' },
  ERROR: { icon: AlertCircle, label: 'Erro' },
  SYSTEM: { icon: Info, label: 'Sistema' },
}

/**
 * Central de notificações do usuário (lista completa + marcar todas lidas).
 */
export default function AppNotificationsPage() {
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setItems(await listNotifications(100))
    } catch {
      toast.error('Erro ao carregar notificações')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function markAll() {
    await markAllNotificationsRead()
    await load()
    toast.success('Notificações marcadas como lidas')
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Notificações"
          description="Avisos de recebimento, lembretes e retiradas"
          action={
            <Button variant="outline" onClick={() => void markAll()} disabled={loading || items.length === 0} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
              <CheckCheck className="h-4 w-4" />
              Marcar todas como lidas
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12 text-[hsl(0,0%,60%)]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)] py-12 text-sm text-[hsl(0,0%,60%)]">
            <Bell className="h-10 w-10 opacity-40" />
            Nenhuma notificação ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const meta = TYPE_ICONS[n.type] ?? { icon: Info, label: 'Notificação' }
              const Icon = meta.icon
              const unread = n.read_at === null
              return (
                <div
                  key={n.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    unread
                      ? 'border-[hsl(4,84%,56%)]/40 bg-[hsl(4,84%,56%)]/[0.06]'
                      : 'border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(4,84%,56%)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-[hsl(0,0%,93%)]">{n.title}</p>
                        {unread && (
                          <Badge variant="secondary" className="shrink-0 bg-[hsl(4,84%,56%)]/20 text-[hsl(4,84%,56%)] border-none">
                            Nova
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-[hsl(0,0%,60%)]">{n.message}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[hsl(0,0%,50%)]">
                        <span>{meta.label}</span>
                        <span>·</span>
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    {unread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void markNotificationRead(n.id)
                          void load()
                        }}
                        className="min-h-[44px] text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,18%)]"
                      >
                        <CheckCheck className="h-4 w-4" />
                        Marcar lida
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
