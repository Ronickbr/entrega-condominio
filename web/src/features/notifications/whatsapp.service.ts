import { supabase } from '@/lib/supabase'

export type WhatsappStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export const WHATSAPP_STATUSES: WhatsappStatus[] = ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED']

export interface WhatsappMessageRecord {
  id: string
  condominium_id: string
  recipient_id: string | null
  phone: string
  package_id: string | null
  message_type: string
  content: string
  status: WhatsappStatus
  provider_message_id: string | null
  attempts: number
  max_attempts: number
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  failed_at: string | null
  last_error: string | null
  created_at: string
}

/** Logs de WhatsApp do condomínio (RLS: admin/síndico). */
export async function listWhatsappMessages(
  condominiumId: string,
  status?: WhatsappStatus | null,
  limit = 100,
): Promise<WhatsappMessageRecord[]> {
  let query = supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('condominium_id', condominiumId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as WhatsappMessageRecord[]
}

/** Reenvia uma mensagem falha: volta para a fila (QUEUED). */
export async function requeueWhatsappMessage(messageId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('requeue_whatsapp_message', {
    p_message_id: messageId,
  })
  return !error && data === true
}

export function isWhatsappStatus(value: string | null | undefined): value is WhatsappStatus {
  return !!value && WHATSAPP_STATUSES.includes(value as WhatsappStatus)
}
