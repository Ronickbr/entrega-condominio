import { supabase } from '@/lib/supabase'

export interface NotificationRecord {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  reference_id: string | null
  read_at: string | null
  created_at: string
}

export const NOTIFICATION_TYPES = new Set([
  'PACKAGE_RECEIVED',
  'PACKAGE_REMINDER',
  'PACKAGE_COLLECTED',
  'AUTHORIZATION_CREATED',
  'AUTHORIZATION_USED',
  'SYSTEM',
  'ERROR',
])

/** Notificações mais recentes (padrão 50). A RLS filtra por auth.uid(). */
export async function listNotifications(limit = 50): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as NotificationRecord[]
}

/** Últimas N não lidas para o dropdown do bell. */
export async function listUnreadNotifications(limit = 10): Promise<NotificationRecord[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as NotificationRecord[]
}

export async function countUnreadNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) return 0
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
}

export async function markAllNotificationsRead(): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
}

/** Subscribe a inserts de notificações do usuário (Realtime + RLS). */
export function subscribeNotifications(callback: () => void): () => void {
  const channel = supabase
    .channel('notifications-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, callback)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
