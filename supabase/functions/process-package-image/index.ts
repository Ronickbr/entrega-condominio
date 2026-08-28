// process-package-image: OCR da foto da etiqueta + matching automático.
//
// Fluxo:
//   1. Autentica o usuário (JWT) e exige perfil operacional (RLS no cliente).
//   2. Baixa a imagem do Storage (`storage_path` = `bucket/condominium_id/...`).
//   3. OCR via Google Vision (fallback mock quando sem credenciais).
//   4. Extração de campos (regex/heurísticas) com confiança por campo.
//   5. Matching contra moradores (Jaro-Winkler + score; top 5).
//   6. Salva SEMPRE package_extractions (raw_result incluso em falhas).
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { json, staticCorsHeaders } from '../_shared/response.ts'
import { authorizeOperational } from './_shared/security.ts'
import { downloadImage, parseStoragePath } from './_shared/storage.ts'
import { extractFromText } from './services/extraction.service.ts'
import { matchResidents } from './services/matching.service.ts'
import { createGoogleVisionProvider } from './providers/google-vision.provider.ts'
import { createMockProvider } from './providers/mock.provider.ts'
import type { CandidateResident, PackageExtractionResult } from './types.ts'

type UserClient = SupabaseClient

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: staticCorsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400)
  }

  const auth = await authorizeOperational(req.headers.get('Authorization'))
  if (auth.error || !auth.client) {
    return json({ error: auth.error }, 401)
  }
  const client = auth.client

  const ref = parseStoragePath((body.storage_path as string) ?? null)
  if (!ref) {
    return json({ error: 'storage_path inválido (esperado: bucket/condominium_id/arquivo)' }, 400)
  }

  const imageBytes = await downloadImage(client, ref)
  if (!imageBytes) {
    return json({ error: 'Imagem não encontrada no storage' }, 404)
  }

  const provider = Deno.env.get('GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64')
    ? createGoogleVisionProvider()
    : createMockProvider()

  let extraction: PackageExtractionResult
  try {
    const ocr = await provider.extractText(imageBytes)
    extraction = extractFromText(ocr.text)
  } catch (err) {
    // raw_result SEMPRE salvo, inclusive em falha de OCR.
    const failed: PackageExtractionResult = {
      recipient_name: null,
      unit_number: null,
      building_name: null,
      cpf: null,
      phone: null,
      carrier: null,
      tracking_code: null,
      barcode: null,
      qr_code: null,
      address: null,
      cep: null,
      nf: null,
      sku: null,
      user_code: null,
      confidence: {},
      raw_result: { error: err instanceof Error ? err.message : 'Erro desconhecido' },
    }
    await saveExtraction(client, ref.condominiumId, failed, provider.name, auth.userId!)
    return json({ error: 'Falha ao analisar a imagem. Tente novamente.' }, 422)
  }

  const candidates = await fetchCandidates(client, ref.condominiumId)
  const matches = matchResidents(extraction, candidates)
  const { extractionId } = await saveExtraction(
    client,
    ref.condominiumId,
    extraction,
    provider.name,
    auth.userId!,
  )

  return json({ extraction, candidates: matches, extraction_id: extractionId })
})

async function fetchCandidates(
  client: UserClient,
  condominiumId: string,
): Promise<CandidateResident[]> {
  const { data, error } = await client
    .from('units')
    .select(
      'number, buildings!left(name), residents!inner(id, profiles!inner(full_name, cpf, phone))',
    )
    .eq('condominium_id', condominiumId)
    .eq('residents.active', true)

  if (error) {
    console.error('Falha ao buscar candidatos:', error)
    return []
  }

  const rows = (data ?? []) as Array<{
    number: string
    buildings: { name: string } | null
    residents: Array<{
      id: string
      profiles: { full_name: string; cpf: string | null; phone: string | null } | null
    }>
  }>

  const seen = new Set<string>()
  const candidates: CandidateResident[] = []
  for (const row of rows) {
    for (const res of row.residents) {
      if (!res.profiles || seen.has(res.id)) continue
      seen.add(res.id)
      candidates.push({
        resident_id: res.id,
        full_name: res.profiles.full_name,
        unit_number: row.number,
        building_name: row.buildings?.name ?? null,
        cpf: res.profiles.cpf ?? null,
        phone: res.profiles.phone ?? null,
      })
    }
  }
  return candidates
}

async function saveExtraction(
  client: UserClient,
  condominiumId: string,
  extraction: PackageExtractionResult,
  provider: string,
  createdBy: string,
): Promise<{ extractionId: string | null }> {
  const { data, error } = await client
    .from('package_extractions')
    .insert({
      condominium_id: condominiumId,
      raw_result: extraction.raw_result,
      recipient_name: extraction.recipient_name,
      unit_number: extraction.unit_number,
      building_name: extraction.building_name,
      cpf: extraction.cpf,
      phone: extraction.phone,
      carrier: extraction.carrier,
      tracking_code: extraction.tracking_code,
      barcode: extraction.barcode,
      qr_code: extraction.qr_code,
      address: extraction.address,
      cep: extraction.cep,
      nf: extraction.nf,
      sku: extraction.sku,
      user_code: extraction.user_code,
      confidence: extraction.confidence,
      provider,
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Falha ao salvar package_extractions:', error)
    return { extractionId: null }
  }
  return { extractionId: data?.id ?? null }
}