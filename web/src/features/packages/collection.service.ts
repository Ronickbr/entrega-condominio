import { supabase } from '@/lib/supabase'

/** Resultado da RPC confirm_package_collection (Etapa 7). */
export interface CollectionResult {
  success: boolean
  message: string
  final_status: string | null
  event_id: string | null
}

/**
 * Confirma a retirada via RPC atômica (UPDATE com status pendente vence 1x;
 * chamada concorrente/duplicada retorna mensagem amigável do backend).
 */
export async function confirmCollection(
  packageId: string,
  opts: {
    collectionType?: 'RESIDENT' | 'THIRD_PARTY'
    thirdPartyAuthId?: string | null
    photoStoragePath?: string | null
    authorizedName?: string | null
    residentPin?: string | null
  } = {},
): Promise<{ data: CollectionResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('confirm_package_collection', {
    p_package_id: packageId,
    p_collection_type: opts.collectionType ?? 'RESIDENT',
    p_third_party_auth_id: opts.thirdPartyAuthId ?? undefined,
    p_photo_storage_path: opts.photoStoragePath ?? undefined,
    p_authorized_name: opts.authorizedName ?? undefined,
    p_resident_pin: opts.residentPin ?? undefined,
  })

  if (error) {
    const permission = /permiss[ãa]o/i.test(error.message)
    return {
      data: null,
      error: permission
        ? 'Você não tem permissão para confirmar entregas.'
        : error.message,
    }
  }

  const rows = (data ?? []) as CollectionResult[]
  const result = rows[0]
  if (!result) {
    return { data: null, error: 'Resposta inesperada do servidor.' }
  }
  return { data: result, error: result.success ? null : result.message }
}