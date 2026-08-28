import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  countUnreadNotifications,
  listUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
  type NotificationRecord,
} from '@/features/notifications/notification.service'

export interface UseNotifications {
  items: NotificationRecord[]
  unread: number
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

/**
 * Central de notificações do usuário: busca as não lidas + contador,
 * com assinatura Realtime (bell dispara em tempo real ao receber).
 */
export function useNotifications(): UseNotifications {
  const { user } = useAuth()
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        listUnreadNotifications(10),
        countUnreadNotifications(),
      ])
      setItems(list)
      setUnread(count)
    } catch {
      // silencioso: realtime continua tentando
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void refresh()
    return subscribeNotifications(() => void refresh())
  }, [user, refresh])

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    void refresh()
  }, [refresh])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    void refresh()
  }, [refresh])

  return { items, unread, refresh, markRead, markAllRead }
}
