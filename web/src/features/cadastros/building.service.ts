import { supabase } from '@/lib/supabase'
import type { BuildingFormValues } from '@/validations/building.schema'

export interface BuildingListItem {
  id: string
  name: string
  identifier: string | null
  active: boolean
  units_count: number
}

export async function listBuildings(condominiumId: string): Promise<BuildingListItem[]> {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, name, identifier, active, units:units(count)')
    .eq('condominium_id', condominiumId)
    .order('name')

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    identifier: row.identifier,
    active: row.active,
    units_count: row.units?.[0]?.count ?? 0,
  }))
}

export async function createBuilding(
  condominiumId: string,
  values: BuildingFormValues,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('buildings')
    .insert({
      condominium_id: condominiumId,
      name: values.name,
      identifier: values.identifier || null,
    })
  return { error: error?.message ?? null }
}

export async function updateBuilding(
  id: string,
  values: BuildingFormValues,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('buildings')
    .update({ name: values.name, identifier: values.identifier || null })
    .eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteBuilding(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('buildings').delete().eq('id', id)
  return { error: error?.message ?? null }
}

export async function deactivateBuilding(id: string): Promise<{ error: string | null }> {
  return deleteBuilding(id)
}

export async function generateCondoStructure(
  condominiumId: string,
  params: {
    towersCount: number
    floorsCount: number
    unitsPerFloor: number
    towerPrefix: string
    numberingType: 'FLOOR_SUFFIX' | 'SEQUENTIAL'
  },
): Promise<{ error: string | null }> {
  const { error } = await (supabase.rpc as any)('generate_condo_structure', {
    p_condominium_id: condominiumId,
    p_towers_count: params.towersCount,
    p_floors_count: params.floorsCount,
    p_units_per_floor: params.unitsPerFloor,
    p_tower_prefix: params.towerPrefix,
    p_numbering_type: params.numberingType,
  })
  return { error: error?.message ?? null }
}