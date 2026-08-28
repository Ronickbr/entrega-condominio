import { createClient } from 'jsr:@supabase/supabase-js@2'
import { json, staticCorsHeaders } from '../../_shared/response.ts'

// POST /auth/v1/auth/impersonate — inicia uma sessão como um papel demo.
// UTILITÁRIO DE TESTE LOCAL (nunca habilitar em produção).
// Desabilitar com: SUPABASE_IMPERSONATION_ENABLED=false
const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  SUPER_ADMIN: { email: 'admin@condominio.dev', password: 'admin' },
  SYNDIC: { email: 'sindico@condominio.dev', password: 'sindico' },
  DOORMAN: { email: 'porteiro@condominio.dev', password: 'porteiro' },
  RECEPTIONIST: { email: 'recepcao@condominio.dev', password: 'recepcao' },
  RESIDENT: { email: 'ana@condominio.dev', password: 'morador1' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: staticCorsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405)
  }

  // Default to disabled — require explicit opt-in via env var.
  if (Deno.env.get('SUPABASE_IMPERSONATION_ENABLED') !== 'true') {
    return json({ error: 'Impersonação desabilitada' }, 403)
  }

  let body: { role?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body JSON inválido' }, 400)
  }

  const role = typeof body.role === 'string' ? body.role : ''
  const cred = DEMO_CREDENTIALS[role]
  if (!cred) {
    return json(
      {
        error: `Papel inválido: "${role}". Use um de: ${Object.keys(DEMO_CREDENTIALS).join(', ')}`,
      },
      400,
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  )

  const { data, error } = await supabase.auth.signInWithPassword(cred)
  if (error) {
    return json({ error: error.message }, 401)
  }

  return json({ session: data.session, user: data.user })
})