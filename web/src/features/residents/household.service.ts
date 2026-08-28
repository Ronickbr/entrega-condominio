import { supabase } from '@/lib/supabase'

/** Cadastro de morador + co-moradores (Etapa pós-lançamento). */

export interface SignupBuilding {
  condominium_id: string
  condominium_name: string
  building_id: string
  building_name: string
}

export interface SignupResidentInput {
  full_name: string
  email: string
  password: string
  building_id: string
  unit_number: string
  phone: string
}

export interface MyUnit {
  id: string
  number: string
  building_name: string | null
  is_primary: boolean
}

export interface HouseholdMember {
  id: string
  full_name: string
  phone: string | null
  created_at: string
}

/** Blocos disponíveis para o formulário de cadastro (público). */
export async function getSignupBuildings(): Promise<SignupBuilding[]> {
  const { data, error } = await supabase.rpc('get_signup_buildings')
  if (error) throw error
  return (data ?? []) as SignupBuilding[]
}

function mapSignupError(message: string): string {
  if (/already registered|already been registered|duplicate/i.test(message)) {
    return 'Este e-mail já está cadastrado.'
  }
  if (/password/i.test(message)) {
    return 'A senha precisa ter pelo menos 6 caracteres.'
  }
  return message || 'Não foi possível concluir o cadastro.'
}

/**
 * Cria o acesso do morador principal (signUp) e vincula a
 * condomínio/bloco/apartamento via RPC. Deixa o usuário autenticado.
 */
export async function signUpResident(input: SignupResidentInput): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { full_name: input.full_name.trim() } },
  })
  if (error) return { error: mapSignupError(error.message) }
  if (!data.session) {
    return { error: 'Cadastro criado. Verifique seu e-mail para confirmar o acesso.' }
  }

  // Marca o cadastro ANTES da RPC (que é mais lenta), para que o banner
  // de boas-vindas apareça mesmo se a rota redirecionar antes dela terminar.
  sessionStorage.setItem('justSignedUp', '1')

  const { error: regError } = await supabase.rpc('register_primary_resident', {
    p_building_id: input.building_id,
    p_unit_number: input.unit_number.trim(),
    p_full_name: input.full_name.trim(),
    p_phone: input.phone,
  })
  if (regError) {
    sessionStorage.removeItem('justSignedUp')
    return { error: mapSignupError(regError.message) }
  }
  return { error: null }
}

/** Unidade do morador logado (apartamento). */
export async function getMyUnit(profileId: string): Promise<MyUnit | null> {
  const { data, error } = await supabase
    .from('residents')
    .select('id, is_primary, unit_id, units(number, buildings(name))')
    .eq('profile_id', profileId)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  const row = data as unknown as {
    id: string
    is_primary: boolean
    units?: { number: string; buildings?: { name: string } | null } | null
  } | null
  if (!row?.units) return null
  return {
    id: (row as unknown as { unit_id: string }).unit_id,
    number: row.units.number,
    building_name: row.units.buildings?.name ?? null,
    is_primary: row.is_primary,
  }
}

/** Co-moradores do apartamento (sem login). */
export async function listHouseholdMembers(): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('id, full_name, phone, created_at')
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as HouseholdMember[]
}

export async function addHouseholdMember(
  unitId: string,
  fullName: string,
  phone: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('add_household_member', {
    p_unit_id: unitId,
    p_full_name: fullName.trim(),
    p_phone: phone.trim(),
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function getMyResidentRecord(profileId: string): Promise<{ id: string; pin_code: string | null } | null> {
  const { data, error } = await (supabase
    .from('residents') as any)
    .select('id, pin_code')
    .eq('profile_id', profileId)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateMyPin(residentId: string, newPin: string): Promise<{ error: string | null }> {
  const { error } = await (supabase.rpc as any)('update_resident_pin', {
    target_resident_id: residentId,
    new_pin: newPin,
  })
  return { error: error?.message ?? null }
}