// process-evolution-webhook: recebe callbacks da Evolution API e
// atualiza status de whatsapp_messages (DELIVERED/READ/FAILED) +
// package_events correspondentes. Idempotente por provider_message_id.
//
// Payload Evolution (mensagens): { event, data: { status?, key: { id } } }
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { json, staticCorsHeaders } from '../_shared/response.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: staticCorsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  // Webhook signature verification: validate shared secret to prevent forged payloads.
  const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET') ?? ''
  if (webhookSecret) {
    const signature = req.headers.get('x-webhook-signature') ?? req.headers.get('authorization')
    if (!signature || signature !== `Bearer ${webhookSecret}`) {
      return json({ error: 'Assinatura do webhook inválida' }, 401)
    }
  }

  const body = await req.json().catch(() => null)
  if (!body) return json({ error: 'Corpo inválido' }, 400)

  const providerMessageId = body?.data?.key?.id ?? body?.data?.message?.key?.id ?? null
  const status = String(body?.data?.status ?? '').toUpperCase()

  if (!providerMessageId) {
    return json({ error: 'provider_message_id ausente no webhook' }, 400)
  }

  const mapped: Record<string, 'DELIVERED' | 'READ' | 'FAILED'> = {
    DELIVERY: 'DELIVERED',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
  }
  const target = mapped[status]

  if (!target) {
    return json({ ack: true, skipped: `status ignorado: ${status || '(vazio)'}` })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Idempotência: não regride status já entregue/lido.
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id, package_id, status')
    .eq('provider_message_id', providerMessageId)
    .maybeSingle()

  if (!existing) {
    return json({ ack: true, skipped: 'mensagem desconhecida (fora do sistema)' })
  }

  const rank: Record<string, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 0 }
  if (rank[target] <= (rank[existing.status] ?? 0)) {
    return json({ ack: true, skipped: `status ${existing.status} já mais avançado` })
  }

  const patch: Record<string, unknown> = { status: target }
  const now = new Date().toISOString()
  if (target === 'DELIVERED') patch.delivered_at = now
  if (target === 'READ') patch.read_at = now
  if (target === 'FAILED') patch.failed_at = now

  await supabase.from('whatsapp_messages').update(patch).eq('id', existing.id)

  if (existing.package_id && target !== 'FAILED') {
    const eventType = target === 'READ' ? 'WHATSAPP_READ' : 'WHATSAPP_DELIVERED'
    await supabase.from('package_events').insert({
      package_id: existing.package_id,
      event_type: eventType,
      payload: { provider_message_id: providerMessageId },
    })
  }

  return json({ ack: true, updated: existing.id, status: target })
})
