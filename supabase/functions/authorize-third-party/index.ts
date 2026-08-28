// Etapa 8 — Autorização de terceiro (criação pelo morador).
// Autentica o morador, valida que possui resident_id ativo no condomínio,
// insere third_party_authorizations e retorna a autorização criada.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { staticCorsHeaders } from '../_shared/response.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

export interface AuthorizationInput {
  package_id?: string | null
  authorized_name: string
  authorized_document?: string | null
  observation?: string | null
  valid_until: string
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: staticCorsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  const apikey = req.headers.get('apikey')

  if (!authHeader) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401, headers: staticCorsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader, apikey: apikey ?? supabaseAnonKey } },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Não autenticado.' }, { status: 401, headers: staticCorsHeaders })
  }

  let body: AuthorizationInput
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'JSON inválido.' }, { status: 400, headers: staticCorsHeaders })
  }

  if (!body.authorized_name?.trim()) {
    return Response.json({ error: 'authorized_name é obrigatório.' }, { status: 400, headers: staticCorsHeaders })
  }

  if (!body.valid_until) {
    return Response.json({ error: 'valid_until é obrigatório.' }, { status: 400, headers: staticCorsHeaders })
  }

  const until = new Date(body.valid_until)
  const now = Date.now()
  if (isNaN(until.getTime()) || until.getTime() <= now) {
    return Response.json(
      { error: 'valid_until deve ser uma data futura.' },
      { status: 400, headers: staticCorsHeaders },
    )
  }
  if (until.getTime() - now > 7 * 24 * 60 * 60 * 1000) {
    return Response.json(
      { error: 'A validade máxima é de 7 dias.' },
      { status: 400, headers: staticCorsHeaders },
    )
  }

  const { data: resident, error: resErr } = await supabase
    .from('residents')
    .select('id, units(condominium_id)')
    .eq('profile_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (resErr || !resident) {
    return Response.json(
      { error: resErr?.message ?? 'Nenhum vínculo de morador encontrado.' },
      { status: 400, headers: staticCorsHeaders },
    )
  }

  const condo = (resident as unknown as { units?: { condominium_id?: string } | null }).units
    ?.condominium_id
  if (!condo) {
    return Response.json(
      { error: 'Não foi possível identificar o seu condomínio.' },
      { status: 400, headers: staticCorsHeaders },
    )
  }

  const { data, error } = await supabase
    .from('third_party_authorizations')
    .insert({
      condominium_id: condo,
      resident_id: resident.id,
      created_by_profile: user.id,
      package_id: body.package_id ?? null,
      authorized_name: body.authorized_name.trim(),
      authorized_document: body.authorized_document?.trim() || null,
      observation: body.observation?.trim() || null,
      valid_until: body.valid_until,
    })
    .select()
    .single()

  if (error) {
    return Response.json(
      { error: error.message ?? 'Erro ao criar autorização.' },
      { status: 400, headers: staticCorsHeaders },
    )
  }

  return Response.json(data, { status: 201, headers: staticCorsHeaders })
}

Deno.serve(handler)