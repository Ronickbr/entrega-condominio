// Acesso a objetos no Storage (bucket + caminho `{condominium_id}/{uuid}.ext`).
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface StorageRef {
  bucket: string
  name: string
  condominiumId: string
}

const PHOTO_BUCKETS = new Set(['package-labels', 'package-images', 'temporary'])

export function parseStoragePath(path: string | null): StorageRef | null {
  if (!path) return null
  const parts = path.split('/').filter(Boolean)
  if (parts.length < 2) return null
  const [bucket, condominiumId, ...rest] = parts
  if (!PHOTO_BUCKETS.has(bucket)) return null
  const name = rest.join('/')
  if (!name) return null
  return { bucket, name, condominiumId }
}

export async function downloadImage(
  client: SupabaseClient,
  ref: StorageRef,
): Promise<Uint8Array | null> {
  const { data, error } = await client.storage.from(ref.bucket).download(ref.name)
  if (error || !data) return null
  return new Uint8Array(await data.arrayBuffer())
}