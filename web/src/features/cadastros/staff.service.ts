import { supabase } from '@/lib/supabase'
import { isStaffPosition, type StaffPosition } from '@/types/cadastros'
import type { StaffFormValues } from '@/validations/staff.schema'

export interface StaffListItem {
  id: string
  profile_id: string
  full_name: string
  email: string
  phone: string | null
  position: StaffPosition
  active: boolean
}

export async function listStaff(condominiumId: string): Promise<StaffListItem[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, profile_id, position, active, profiles:profiles(full_name, email, phone)')
    .eq('condominium_id', condominiumId)
    .order('position')

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    profile_id: row.profile_id,
    full_name: row.profiles?.full_name ?? '—',
    email: row.profiles?.email ?? '',
    phone: row.profiles?.phone ?? null,
    position: isStaffPosition(row.position) ? row.position : 'DOORMAN',
    active: row.active,
  }))
}

export async function createStaff(
  condominiumId: string,
  values: StaffFormValues,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('staff').insert({
    profile_id: values.profile_id,
    condominium_id: condominiumId,
    position: values.position,
  })
  return { error: error?.message ?? null }
}

export async function updateStaff(
  id: string,
  values: StaffFormValues,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('staff')
    .update({ profile_id: values.profile_id, position: values.position })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deactivateStaff(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('staff').update({ active: false }).eq('id', id)
  return { error: error?.message ?? null }
}

export interface StaffProfileCandidate {
  id: string
  full_name: string
  email: string
}

export async function listStaffProfileCandidates(): Promise<StaffProfileCandidate[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name')

  if (error) throw error
  return (data ?? [])
    .filter((p) => p.role !== 'RESIDENT')
    .map((p) => ({ id: p.id, full_name: p.full_name, email: p.email }))
}