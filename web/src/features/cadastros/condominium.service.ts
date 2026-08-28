import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/supabase'
import type { CondominiumAddress } from '@/types/cadastros'
import type { CondominiumFormValues } from '@/validations/condominium.schema'

export interface CondominiumRecord {
  id: string
  name: string
  cnpj: string | null
  phone: string | null
  email: string | null
  address: CondominiumAddress | null
  syndic_name: string | null
  admin_phone: string | null
  active: boolean
}

export async function listCondominiums(): Promise<CondominiumRecord[]> {
  const { data, error } = await supabase
    .from('condominiums')
    .select(
      'id, name, cnpj, phone, email, address, syndic_name, admin_phone, active',
    )
    .order('name')

  if (error) throw error
  return (data ?? []).map((row) => ({
    ...row,
    address: (row.address as CondominiumAddress | null) ?? null,
  }))
}

export async function updateCondominium(
  id: string,
  values: CondominiumFormValues,
): Promise<{ error: string | null }> {
  const address = values.address
  const { error } = await supabase
    .from('condominiums')
    .update({
      name: values.name,
      cnpj: values.cnpj || null,
      phone: values.phone || null,
      email: values.email || null,
      syndic_name: values.syndic_name || null,
      admin_phone: values.admin_phone || null,
      address: (Object.values(address).some((v) => v !== '')
        ? (address as unknown as Json)
        : null) as Json | null,
    })
    .eq('id', id)

  return { error: error?.message ?? null }
}

export function addressToForm(address: CondominiumAddress | null): CondominiumFormValues['address'] {
  return {
    street: address?.street ?? '',
    number: address?.number ?? '',
    complement: address?.complement ?? '',
    neighborhood: address?.neighborhood ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    zipcode: address?.zipcode ?? '',
  }
}