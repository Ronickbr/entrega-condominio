import { supabase } from '@/lib/supabase'
import type { UnitFormValues } from '@/validations/unit.schema'

export interface UnitListItem {
  id: string
  number: string
  floor: string | null
  building_id: string | null
  building_name: string | null
  active: boolean
}

export async function listUnits(condominiumId: string): Promise<UnitListItem[]> {
  const { data, error } = await supabase
    .from('units')
    .select('id, number, floor, building_id, active, building:buildings(name)')
    .eq('condominium_id', condominiumId)
    .order('number')

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    number: row.number,
    floor: row.floor,
    building_id: row.building_id,
    building_name: row.building?.name ?? null,
    active: row.active,
  }))
}

export async function createUnit(
  condominiumId: string,
  values: UnitFormValues,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('units').insert({
    condominium_id: condominiumId,
    number: values.number,
    floor: values.floor || null,
    building_id: values.building_id,
  })
  return { error: error?.message ?? null }
}

export async function updateUnit(
  id: string,
  values: UnitFormValues,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('units')
    .update({ number: values.number, floor: values.floor || null, building_id: values.building_id })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deactivateUnit(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('units').update({ active: false }).eq('id', id)
  return { error: error?.message ?? null }
}