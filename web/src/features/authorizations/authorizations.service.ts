import { supabase } from '@/lib/supabase'

export const AUTH_STATUSES = ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'] as const
export type AuthStatus = (typeof AUTH_STATUSES)[number]

export const AUTH_STATUS_LABELS: Record<AuthStatus, string> = {
  ACTIVE: 'Ativa',
  USED: 'Utilizada',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
}

/** Autorização de retirada por terceiro (Etapa 8). */
export interface AuthorizationRecord {
  id: string
  condominium_id: string
  resident_id: string
  created_by_profile: string
  package_id: string | null
  authorized_name: string
  authorized_document: string | null
  observation: string | null
  valid_from: string
  valid_until: string
  status: AuthStatus
  used_at: string | null
  used_by: string | null
  photo_storage_path: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  created_at: string
  package?: { internal_code: string } | null
  residents?: { profiles?: { full_name?: string } | null } | null
}

const AUTHZ_SELECT = '*, packages(internal_code), residents(profiles(full_name))'

/** Status lógico: ACTIVE com validade vencida vira EXPIRED (display + regra de negócio). */
export function effectiveStatus(a: { status: AuthStatus; valid_until: string }): AuthStatus {
  if (a.status === 'ACTIVE' && new Date(a.valid_until).getTime() < Date.now()) {
    return 'EXPIRED'
  }
  return a.status
}

/** Minhas autorizações (RLS: morador só as próprias). */
export async function listMyAuthorizations(): Promise<AuthorizationRecord[]> {
  const { data, error } = await supabase
    .from('third_party_authorizations')
    .select(AUTHZ_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AuthorizationRecord[]
}

export async function getAuthorization(id: string): Promise<AuthorizationRecord | null> {
  const { data, error } = await supabase
    .from('third_party_authorizations')
    .select(AUTHZ_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as AuthorizationRecord | null) ?? null
}

export interface CreateAuthorizationInput {
  package_id: string | null
  authorized_name: string
  authorized_document: string | null
  observation: string | null
  valid_until: string
}

/** Cria autorização para o morador logado (deriva residente/condomínio via RLS). */
export async function createAuthorization(
  input: CreateAuthorizationInput,
): Promise<{ data: AuthorizationRecord | null; error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Não autenticado.' }

  const { data: resident, error: resErr } = await supabase
    .from('residents')
    .select('id, units(condominium_id)')
    .eq('profile_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (resErr || !resident) {
    return { data: null, error: resErr?.message ?? 'Nenhum vínculo de morador encontrado.' }
  }

  const condo = (resident as unknown as { units?: { condominium_id?: string } | null }).units
    ?.condominium_id
  if (!condo) return { data: null, error: 'Não foi possível identificar o seu condomínio.' }

  const { data, error } = await supabase
    .from('third_party_authorizations')
    .insert({
      condominium_id: condo,
      resident_id: resident.id,
      created_by_profile: user.id,
      package_id: input.package_id,
      authorized_name: input.authorized_name,
      authorized_document: input.authorized_document || null,
      observation: input.observation || null,
      valid_until: input.valid_until,
    })
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Erro ao criar autorização.' }
  }
  return { data: data as AuthorizationRecord, error: null }
}

export async function cancelAuthorization(
  id: string,
): Promise<{ data: AuthorizationRecord | null; error: string | null }> {
  const { data, error } = await supabase
    .from('third_party_authorizations')
    .update({ status: 'CANCELLED' })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error || !data) {
    return { data: null, error: error?.message ?? 'Não foi possível cancelar a autorização.' }
  }
  return { data: data as AuthorizationRecord, error: null }
}

/** Busca operacional por autorizações (RLS restringe ao condomínio). */
export async function listOperationalAuthorizations(opts: {
  search?: string
  status?: AuthStatus
}): Promise<AuthorizationRecord[]> {
  let query = supabase
    .from('third_party_authorizations')
    .select(AUTHZ_SELECT)
    .order('created_at', { ascending: false })
    .limit(50)

  if (opts.status) query = query.eq('status', opts.status)
  if (opts.search) {
    const q = opts.search.trim().replace(/[%_]/g, (m) => `\\${m}`)
    if (q) {
      query = query.or(`authorized_name.ilike.%${q}%,authorized_document.ilike.%${q}%`)
    }
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AuthorizationRecord[]
}