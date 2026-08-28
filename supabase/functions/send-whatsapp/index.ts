// send-whatsapp: consome a fila whatsapp_messages (status QUEUED) e
// envia via Evolution API. Retry 3x com backoff 0s/60s/300s.
// Falhas → status FAILED + last_error; sucesso → SENT + package_events.
//
// Variáveis: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { json, staticCorsHeaders } from '../_shared/response.ts'
import { backoffDelaySeconds, sendText, type EvolutionConfig } from './services/whatsapp.service.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

interface QueueRow {
  id: string
  condominium_id: string
  package_id: string | null
  phone: string
  content: string
  message_type: string
  attempts: number
  max_attempts: number
  provider_message_id: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: staticCorsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  // Auth: require a valid API key header to prevent unauthorized usage.
  const apiKey = req.headers.get('x-api-key')
  const expectedKey = Deno.env.get('WHATSAPP_SENDER_API_KEY') ?? ''
  if (!expectedKey || apiKey !== expectedKey) {
    return json({ error: 'Não autorizado' }, 401)
  }

  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return json({ error: 'Evolution API não configurada (EVOLUTION_API_URL/KEY/INSTANCE).' }, 422)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const config: EvolutionConfig = {
    apiUrl: EVOLUTION_API_URL,
    apiKey: EVOLUTION_API_KEY,
    instance: EVOLUTION_INSTANCE,
  }

  const batchSize = Number((await req.json().catch(() => ({})) as { batch_size?: number }).batch_size ?? 10)
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('status', 'QUEUED')
    .order('created_at', { ascending: true })
    .limit(Math.min(batchSize, 50))

  if (error) return json({ error: error.message }, 500)

  const results = { processed: 0, sent: 0, failed: 0, requeued: 0 }
  for (const row of (data ?? []) as QueueRow[]) {
    const attempt = (row.attempts ?? 0) + 1

    const sent = await sendText(config, row.phone, row.content)
    if (sent.ok) {
      const next: Record<string, unknown> = {
        status: 'SENT',
        attempts: attempt,
        provider_message_id: sent.providerMessageId ?? row.provider_message_id,
        sent_at: new Date().toISOString(),
        last_error: null,
      }
      await supabase.from('whatsapp_messages').update(next).eq('id', row.id)
      results.sent++

      if (row.package_id) {
        await supabase.from('package_events').insert({
          package_id: row.package_id,
          event_type: 'WHATSAPP_SENT',
          payload: { message_id: row.id, provider_message_id: sent.providerMessageId ?? null },
        })
      }
    } else if (attempt >= (row.max_attempts ?? 3)) {
      await supabase.from('whatsapp_messages').update({
        status: 'FAILED',
        attempts: attempt,
        failed_at: new Date().toISOString(),
        last_error: sent.error ?? 'Falha desconhecida',
      }).eq('id', row.id)
      results.failed++

      if (row.package_id) {
        await supabase.from('package_events').insert({
          package_id: row.package_id,
          event_type: 'WHATSAPP_FAILED',
          payload: { message_id: row.id, attempts: attempt, error: sent.error ?? null },
        })
      }
    } else {
      await supabase.from('whatsapp_messages').update({
        attempts: attempt,
        last_error: sent.error ?? 'Falha desconhecida',
      }).eq('id', row.id)
      results.requeued++
      console.log(`Reenfileirada ${row.id} p/ ${backoffDelaySeconds(attempt)}s (tentativa ${attempt})`)
    }
    results.processed++
  }

  return json({ ...results })
})
