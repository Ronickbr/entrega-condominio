import { supabase } from '@/lib/supabase'

/** Etapa 10.3 — Consentimentos LGPD + configurações do condomínio. */

export const CONSENT_TYPES = [
  'DATA_USAGE',
  'WHATSAPP_NOTIFICATIONS',
  'APP_NOTIFICATIONS',
  'THIRD_PARTY_PHOTO',
] as const

export type ConsentType = (typeof CONSENT_TYPES)[number]

export interface ConsentRow {
  id: string
  profile_id: string
  consent_type: ConsentType
  granted: boolean
  granted_at: string | null
  revoked_at: string | null
}

/** Consentimentos do morador logado (RLS: só os próprios). */
export async function listMyConsents(): Promise<ConsentRow[]> {
  const { data, error } = await supabase
    .from('lgpd_consents')
    .select('*')
    .order('consent_type')
  if (error) throw error
  return (data ?? []) as ConsentRow[]
}

/** Upsert de consentimento (concede ou revoga). */
export async function setConsent(
  profileId: string,
  consentType: ConsentType,
  granted: boolean,
): Promise<ConsentRow> {
  const { data, error } = await supabase
    .from('lgpd_consents')
    .upsert(
      {
        profile_id: profileId,
        consent_type: consentType,
        granted,
        granted_at: granted ? new Date().toISOString() : null,
        revoked_at: granted ? null : new Date().toISOString(),
      },
      { onConflict: 'profile_id,consent_type' },
    )
    .select()
    .single()
  if (error) throw error
  return data as ConsentRow
}

/** Solicitação de exclusão de dados (GDPR) — RPC. */
export async function submitExclusionRequest(profileId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('submit_data_exclusion_request', {
    p_profile_id: profileId,
  })
  if (error) throw error
  return (data as string | null) ?? null
}

export interface SystemSettings {
  id: string
  condominium_id: string
  whatsapp_enabled: boolean
  reminders_enabled: boolean
  reminder_24h: boolean
  reminder_48h: boolean
  reminder_72h: boolean
  photo_retention_days: number
}

export async function getSystemSettings(condominiumId: string): Promise<SystemSettings | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('condominium_id', condominiumId)
    .maybeSingle()
  if (error) throw error
  return (data as SystemSettings | null) ?? null
}

export async function updateSystemSettings(
  condominiumId: string,
  patch: Partial<Omit<SystemSettings, 'id' | 'condominium_id'>>,
): Promise<SystemSettings | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .update(patch)
    .eq('condominium_id', condominiumId)
    .select()
    .maybeSingle()
  if (error) throw error
  return (data as SystemSettings | null) ?? null
}

export async function wipeDatabase(): Promise<{ error: string | null }> {
  const { error } = await (supabase.rpc as any)('wipe_database')
  return { error: error?.message ?? null }
}

export async function seedMockupData(): Promise<{ error: string | null }> {
  const { error } = await (supabase.rpc as any)('seed_mockup_data')
  return { error: error?.message ?? null }
}