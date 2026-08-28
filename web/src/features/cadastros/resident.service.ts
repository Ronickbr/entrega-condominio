import { supabase } from '@/lib/supabase'
import type { ResidentFormValues } from '@/validations/resident.schema'

export interface ResidentListItem {
  id: string
  profile_id: string
  full_name: string
  email: string
  cpf: string | null
  phone: string | null
  unit_id: string
  unit_number: string | null
  building_name: string | null
  is_primary: boolean
  active: boolean
  pin_code: string | null
}

export async function listResidents(): Promise<ResidentListItem[]> {
  const { data, error } = await supabase
    .from('residents')
    .select('*, profiles(full_name, email, cpf, phone), units(number, buildings(name))')
    .order('is_primary', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row: any) => ({
    id: row.id,
    profile_id: row.profile_id,
    unit_id: row.unit_id,
    is_primary: row.is_primary,
    active: row.active,
    pin_code: row.pin_code ?? null,
    full_name: row.profiles?.full_name ?? '—',
    email: row.profiles?.email ?? '',
    cpf: row.profiles?.cpf ?? null,
    phone: row.profiles?.phone ?? null,
    unit_number: row.units?.number ?? null,
    building_name: row.units?.buildings?.name ?? null,
  }))
}

export async function createResident(
  values: ResidentFormValues,
): Promise<{ error: string | null }> {
  const payload: any = { 
    profile_id: values.profile_id, 
    unit_id: values.unit_id, 
    is_primary: values.is_primary 
  }
  if (values.pin_code && values.pin_code.trim() !== '') {
    payload.pin_code = values.pin_code.trim()
  }
  const { error } = await supabase
    .from('residents')
    .insert(payload)
  return { error: error?.message ?? null }
}

export async function updateResident(
  id: string,
  values: ResidentFormValues,
): Promise<{ error: string | null }> {
  const payload: any = { 
    profile_id: values.profile_id, 
    unit_id: values.unit_id, 
    is_primary: values.is_primary 
  }
  if (values.pin_code !== undefined && values.pin_code !== '') {
    payload.pin_code = values.pin_code.trim()
  }
  const { error } = await supabase
    .from('residents')
    .update(payload)
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function updateResidentPin(
  residentId: string,
  newPin: string,
): Promise<{ error: string | null }> {
  const { error } = await (supabase.rpc as any)('update_resident_pin', {
    target_resident_id: residentId,
    new_pin: newPin,
  })
  return { error: error?.message ?? null }
}

export async function deleteResident(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('residents').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export interface ProfileCandidate {
  id: string
  full_name: string
  email: string
}

export async function listProfileCandidates(): Promise<ProfileCandidate[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  if (error) throw error
  return (data ?? [])
    .filter((p) => p.role === 'RESIDENT')
    .map((p) => ({ id: p.id, full_name: p.full_name, email: p.email }))
}