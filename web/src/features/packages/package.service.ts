import { supabase, SUPABASE_ANON_KEY } from '@/lib/supabase'
import { compressImage, uuid } from '@/lib/utils'
import {
  isPackageStatus,
  PENDING_STATUSES,
  PackageStatus,
  type PackageEventRecord,
  type PackageImageRecord,
} from './package.types'
import type { PackageFormValues } from './package.schema'
import type { OcrScanResponse } from './ocr.types'

/** Encomenda com dados de exibição resolvidos (joins). */
export interface PackageListItem {
  id: string
  internal_code: string
  status: PackageStatus
  carrier: string | null
  tracking_code: string | null
  notes: string | null
  received_at: string
  collected_at: string | null
  recipient_name_raw: string | null
  resident_id: string | null
  unit_id: string | null
  resident_name: string | null
  unit_label: string | null
  received_by_name: string | null
  collected_by_name: string | null
}

/** Opção de morador para o seletor da portaria. */
export interface ResidentOption {
  resident_id: string
  profile_id: string
  full_name: string
  email: string
  cpf: string | null
  unit_id: string
  unit_label: string
  /** Co-morador cadastrado pelo morador principal (sem login). */
  is_household?: boolean
}

const PACKAGE_SELECT = `*,
  residents(profiles(full_name)),
  units(number, buildings(name)),
  received_by:profiles!packages_received_by_fkey(full_name),
  collected_by:profiles!packages_collected_by_fkey(full_name)`

type PackageRow = {
  id: string
  internal_code: string
  status: string
  carrier: string | null
  tracking_code: string | null
  notes: string | null
  received_at: string
  collected_at: string | null
  recipient_name_raw: string | null
  resident_id: string | null
  unit_id: string | null
  residents?: { profiles?: { full_name: string } | null } | null
  units?: { number: string; buildings?: { name: string } | null } | null
  received_by?: { full_name: string } | null
  collected_by?: { full_name: string } | null
} & Record<string, unknown>

function mapPackage(row: PackageRow): PackageListItem {
  const building = row.units?.buildings?.name
  const unitNumber = row.units?.number
  return {
    id: row.id,
    internal_code: row.internal_code,
    status: isPackageStatus(row.status) ? row.status : PackageStatus.AGUARDANDO_RETIRADA,
    carrier: row.carrier,
    tracking_code: row.tracking_code,
    notes: row.notes,
    received_at: row.received_at,
    collected_at: row.collected_at,
    recipient_name_raw: row.recipient_name_raw,
    resident_id: row.resident_id,
    unit_id: row.unit_id,
    resident_name: row.residents?.profiles?.full_name ?? null,
    unit_label: unitNumber
      ? building
        ? `${building} ${unitNumber}`.trim()
        : unitNumber
      : null,
    received_by_name: row.received_by?.full_name ?? null,
    collected_by_name: row.collected_by?.full_name ?? null,
  }
}

/** Pendências da portaria (aguardando retirada + não identificadas). */
export async function listPendingPackages(condominiumId: string): Promise<PackageListItem[]> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('condominium_id', condominiumId)
    .in('status', [...PENDING_STATUSES])
    .eq('active', true)
    .order('received_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((r) => mapPackage(r as unknown as PackageRow))
}

/** Todas as encomendas do condomínio (portaria). */
export async function listPackages(condominiumId: string): Promise<PackageListItem[]> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('condominium_id', condominiumId)
    .eq('active', true)
    .order('received_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((r) => mapPackage(r as unknown as PackageRow))
}

/** Encomendas do morador logado (RLS já filtra). */
export async function listMyPackages(): Promise<PackageListItem[]> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('active', true)
    .order('received_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((r) => mapPackage(r as unknown as PackageRow))
}

export async function getPackage(id: string): Promise<PackageListItem | null> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? mapPackage(data as unknown as PackageRow) : null
}

/**
 * Cadastra encomenda manualmente e, se houver foto da etiqueta,
 * faz upload para storage e registra package_images.
 */
export async function createPackage(
  condominiumId: string,
  userId: string,
  unitId: string | null,
  values: PackageFormValues,
  photo: File | null,
): Promise<{ data: PackageListItem | null; error: string | null }> {
  const { data, error } = await supabase
    .from('packages')
    .insert({
      condominium_id: condominiumId,
      unit_id: unitId,
      resident_id: values.resident_id,
      recipient_name_raw: values.recipient_name_raw || null,
      carrier: values.carrier || null,
      tracking_code: values.tracking_code || null,
      notes: values.notes || null,
      status: values.resident_id ? PackageStatus.AGUARDANDO_RETIRADA : PackageStatus.NAO_IDENTIFICADA,
      received_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Erro ao cadastrar encomenda' }
  }

  if (photo) {
    const path = await uploadLabelImage(condominiumId, photo)
    if (!path) return { data: null, error: 'Encomenda criada, mas falhou ao enviar a foto da etiqueta.' }
    const { error: imgError } = await supabase.from('package_images').insert({
      package_id: data.id,
      storage_path: path,
      image_type: 'LABEL',
      created_by: userId,
    })
    if (imgError) return { data: null, error: 'Encomenda criada, mas falhou ao registrar a foto.' }
  }

  return { data: mapPackage(data as unknown as PackageRow), error: null }
}

/** Envia a foto da etiqueta para o bucket package-labels. */
export async function uploadLabelImage(condominiumId: string, file: File): Promise<string | null> {
  try {
    const blob = file.size > 2 * 1024 * 1024 ? await compressImage(file) : file
    const path = `${condominiumId}/${uuid()}.jpeg`
    const { error } = await supabase.storage
      .from('package-labels')
      .upload(path, blob, { contentType: 'image/jpeg' })
    return error ? null : path
  } catch {
    return null
  }
}

export async function listPackageImages(packageId: string): Promise<PackageImageRecord[]> {
  const { data, error } = await supabase
    .from('package_images')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as PackageImageRecord[]
}

export async function listPackageEvents(packageId: string): Promise<PackageEventRecord[]> {
  const { data, error } = await supabase
    .from('package_events')
    .select('*, profiles(full_name)')
    .eq('package_id', packageId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []).map((e) => ({
    id: e.id,
    package_id: e.package_id,
    event_type: e.event_type,
    payload: (e.payload ?? {}) as Record<string, unknown>,
    user_id: e.user_id,
    user_name: (e as unknown as { profiles?: { full_name: string } | null }).profiles?.full_name ?? null,
    created_at: e.created_at,
  })) as PackageEventRecord[]
}

/** URL assinada (1h) para leitura de imagem do storage. */
export async function getSignedImageUrl(path: string): Promise<string | null> {
  const [bucket, ...rest] = path.split('/')
  if (!bucket || rest.length === 0) return null
  const name = rest.join('/')
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(name, 3600)
  return error ? null : data.signedUrl
}

/**
 * Chama a edge function process-package-image: OCR + matching.
 * `storagePath` no formato `condominium_id/arquivo` — prefixo do bucket
 * é adicionado automaticamente.
 * Usa URL relativa para contornar CORS no dev (Vite proxy encaminha).
 */
export async function scanLabelImage(
  storagePath: string,
): Promise<{ data: OcrScanResponse | null; error: string | null }> {
  const fullPath = `package-labels/${storagePath}`
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch('/functions/v1/process-package-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ storage_path: fullPath }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    return { data: null, error: body?.error ?? `Erro ${res.status}` }
  }

  const json = await res.json()
  if (json.error) {
    return { data: null, error: json.error }
  }
  return { data: json as OcrScanResponse, error: null }
}

/** Moradores disponíveis para vínculo de encomenda (portaria). A RLS
 * já restringe aos residentes visíveis do condomínio logado. Inclui
 * também os co-moradores (sem login) para reconhecimento de nomes. */
export async function listResidentOptions(): Promise<ResidentOption[]> {
  const { data, error } = await supabase
    .from('residents')
    .select(
      'id, profile_id, unit_id, is_primary, profiles(full_name, email, cpf), units(number, buildings(name))',
    )
    .eq('active', true)
    .order('profile_id')

  if (error) throw error

  const labels = new Map<string, string>()
  const primaryByUnit = new Map<string, string>()

  const options: ResidentOption[] = (data ?? [])
    .filter((r) => r.profiles)
    .map((r) => {
      const building = r.units?.buildings?.name
      const unitNumber = r.units?.number
      const label = unitNumber
        ? building
          ? `${building} ${unitNumber}`.trim()
          : unitNumber
        : 'Sem unidade'
      if (r.unit_id) {
        labels.set(r.unit_id, label)
        if (r.is_primary) primaryByUnit.set(r.unit_id, r.id)
      }
      return {
        resident_id: r.id,
        profile_id: r.profile_id,
        full_name: r.profiles?.full_name ?? '—',
        email: r.profiles?.email ?? '',
        cpf: r.profiles?.cpf ?? null,
        unit_id: r.unit_id,
        unit_label: label,
      }
    })

  // Co-moradores (sem login): reconhecidos pelo nome, mas a notificação
  // vai para o morador principal da unidade.
  const { data: household, error: householdErr } = await supabase
    .from('household_members')
    .select('full_name, unit_id')
    .eq('active', true)
  if (!householdErr && household) {
    for (const hm of household) {
      const primary = primaryByUnit.get(hm.unit_id)
      if (!primary) continue
      options.push({
        resident_id: primary,
        profile_id: '',
        full_name: hm.full_name,
        email: '',
        cpf: null,
        unit_id: hm.unit_id,
        unit_label: labels.get(hm.unit_id) ?? 'Sem unidade',
        is_household: true,
      })
    }
  }

  return options
}