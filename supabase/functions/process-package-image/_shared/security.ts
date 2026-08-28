// Autenticação/autorização da edge function.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

export interface AuthResult {
  client: SupabaseClient | null
  userId: string | null
  role: string | null
  error: string | null
}

/** Cliente autenticado com o JWT do usuário (RLS ativo). */
export function createUserClient(authHeader: string | null): SupabaseClient | null {
  if (!authHeader) return null
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
}

/**
 * Valida JWT e exige perfil operacional (porteiro/recepção/síndico/admin).
 */
export async function authorizeOperational(authHeader: string | null): Promise<AuthResult> {
  const client = createUserClient(authHeader)
  if (!client) {
    return { client: null, userId: null, role: null, error: 'Token de autenticação ausente' }
  }

  const { data, error } = await client.auth.getUser()
  if (error || !data.user) {
    return { client, userId: null, role: null, error: 'Sessão inválida ou expirada' }
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const role = profile?.role ?? null
  const operational = role === 'SUPER_ADMIN' || role === 'SYNDIC' || role === 'DOORMAN' || role === 'RECEPTIONIST'
  if (!operational) {
    return { client, userId: data.user.id, role, error: 'Acesso restrito à portaria' }
  }

  return { client, userId: data.user.id, role, error: null }
}