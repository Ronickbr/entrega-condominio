import { createClient } from 'jsr:@supabase/supabase-js@2'
import { json, staticCorsHeaders } from '../../_shared/response.ts'

// GET /auth/v1/auth/me — retorna usuário + profile + memberships do token atual.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: staticCorsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Não autenticado' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return json({ error: 'Não autenticado' }, 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return json({ error: profileError.message }, 500)
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('condo_memberships')
    .select('*, condominium:condominiums(*), unit:units(*)')
    .eq('profile_id', user.id)

  if (membershipsError) {
    return json({ error: membershipsError.message }, 500)
  }

  return json({ user, profile, memberships })
})