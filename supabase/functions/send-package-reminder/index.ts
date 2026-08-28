// send-package-reminder: varre encomendas pendentes além dos
// thresholds (24/48/72h) e gera REMINDER_SENT + notificação + fila WA.
// Wrapper do RPC run_reminder_scan (idempotente no banco).
// Corpo opcional: { condominium_id?: string }.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { json, staticCorsHeaders } from '../_shared/response.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: staticCorsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  // Auth: require a valid API key header to prevent unauthorized usage.
  const apiKey = req.headers.get('x-api-key')
  const expectedKey = Deno.env.get('WHATSAPP_SENDER_API_KEY') ?? ''
  if (!expectedKey || apiKey !== expectedKey) {
    return json({ error: 'Não autorizado' }, 401)
  }

  const body = await req.json().catch(() => ({}))
  const condominiumId = (body as { condominium_id?: string }).condominium_id ?? null

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.rpc('run_reminder_scan', {
    p_condominium_id: condominiumId,
  })

  if (error) return json({ error: error.message }, 500)

  const rows = (data ?? []) as Array<{
    package_id: string
    internal_code: string
    threshold_hours: number
    action: string
  }>

  return json({ reminders_created: rows.length, reminders: rows })
})
