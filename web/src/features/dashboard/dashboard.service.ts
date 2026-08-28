import { supabase } from '@/lib/supabase'
import type { PackageStatus } from '@/features/packages/package.types'

/** Etapa 9 — Dashboards, Relatórios e Busca Global. */

export interface CarrierSlice {
  carrier: string
  count: number
}

export interface TopUnitSlice {
  unit: string
  count: number
}

export interface DailyPoint {
  date: string
  received: number
  collected: number
}

export interface DashboardOverview {
  received_today: number
  received_week: number
  received_period: number
  pending_total: number
  pending_24h: number
  pending_48h: number
  pending_72h: number
  collected_today: number
  avg_hours_to_collect: number | null
  residents_active: number
  staff_active: number
  carriers_breakdown: CarrierSlice[]
  top_units: TopUnitSlice[]
  daily_timeseries: DailyPoint[]
  whatsapp_failed_7d: number
  storage_used_bytes: number
}

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' ? v : Number(v ?? fallback)

/** Métricas consolidadas do condomínio (RPC get_dashboard_overview). */
export async function getDashboardOverview(
  condominiumId: string,
  opts: { start?: string; end?: string } = {},
): Promise<DashboardOverview> {
  const { data, error } = await supabase.rpc('get_dashboard_overview', {
    p_condominium_id: condominiumId,
    p_start: opts.start ?? undefined,
    p_end: opts.end ?? undefined,
  })
  if (error) throw error

  const o = (data ?? {}) as Record<string, unknown>
  return {
    received_today: num(o.received_today),
    received_week: num(o.received_week),
    received_period: num(o.received_period),
    pending_total: num(o.pending_total),
    pending_24h: num(o.pending_24h),
    pending_48h: num(o.pending_48h),
    pending_72h: num(o.pending_72h),
    collected_today: num(o.collected_today),
    avg_hours_to_collect:
      o.avg_hours_to_collect == null ? null : num(o.avg_hours_to_collect),
    residents_active: num(o.residents_active),
    staff_active: num(o.staff_active),
    carriers_breakdown: (o.carriers_breakdown as CarrierSlice[]) ?? [],
    top_units: (o.top_units as TopUnitSlice[]) ?? [],
    daily_timeseries: (o.daily_timeseries as DailyPoint[]) ?? [],
    whatsapp_failed_7d: num(o.whatsapp_failed_7d),
    storage_used_bytes: num(o.storage_used_bytes),
  }
}

export interface GlobalSearchResult {
  id: string
  category: 'unit' | 'resident' | 'package' | 'authorization' | string
  title: string
  subtitle: string
}

/** Busca global (RPC global_search) em unidades/moradores/encomendas/autorizações. */
export async function globalSearch(
  condominiumId: string,
  term: string,
  limit = 20,
): Promise<GlobalSearchResult[]> {
  const trimmed = term.trim()
  if (!trimmed) return []

  const { data, error } = await supabase.rpc('global_search', {
    p_condominium_id: condominiumId,
    p_term: trimmed,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as GlobalSearchResult[]
}

export interface ReportFilters {
  start?: string
  end?: string
  unitId?: string
  residentId?: string
  carrier?: string
  status?: PackageStatus
}

export interface ReportPackageRow {
  internal_code: string
  status: string
  received_at: string | null
  collected_at: string | null
  resident_name: string | null
  unit_label: string | null
  carrier: string | null
  tracking_code: string | null
  collection_type: string | null
  received_by_name: string | null
  collected_by_name: string | null
  notes: string | null
}

type ReportRowRaw = {
  internal_code: string
  status: string
  received_at: string | null
  collected_at: string | null
  carrier: string | null
  tracking_code: string | null
  collection_type: string | null
  notes: string | null
  residents?: { profiles?: { full_name: string } | null } | null
  units?: { number: string; buildings?: { name: string } | null } | null
  received_by?: { full_name: string } | null
  collected_by?: { full_name: string } | null
} & Record<string, unknown>

function mapReportRow(r: ReportRowRaw): ReportPackageRow {
  const building = r.units?.buildings?.name
  const unitNumber = r.units?.number
  return {
    internal_code: r.internal_code,
    status: r.status,
    received_at: r.received_at,
    collected_at: r.collected_at,
    resident_name: r.residents?.profiles?.full_name ?? null,
    unit_label: unitNumber
      ? building
        ? `${building} ${unitNumber}`.trim()
        : unitNumber
      : null,
    carrier: r.carrier,
    tracking_code: r.tracking_code,
    collection_type: r.collection_type,
    received_by_name: r.received_by?.full_name ?? null,
    collected_by_name: r.collected_by?.full_name ?? null,
    notes: r.notes,
  }
}

const REPORT_SELECT = `internal_code, status, received_at, collected_at, carrier, tracking_code,
  collection_type, notes, residents(profiles(full_name)), units(number, buildings(name)),
  received_by:profiles!packages_received_by_fkey(full_name),
  collected_by:profiles!packages_collected_by_fkey(full_name)`

/** Encomendas para o relatório do síndico (com filtros + colunas do CSV). */
export async function listReportPackages(
  condominiumId: string,
  filters: ReportFilters = {},
): Promise<ReportPackageRow[]> {
  let query = supabase
    .from('packages')
    .select(REPORT_SELECT)
    .eq('condominium_id', condominiumId)
    .eq('active', true)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.carrier) query = query.eq('carrier', filters.carrier)
  if (filters.unitId) query = query.eq('unit_id', filters.unitId)
  if (filters.residentId) query = query.eq('resident_id', filters.residentId)
  if (filters.start) query = query.gte('received_at', new Date(`${filters.start}T00:00:00`).toISOString())
  if (filters.end) query = query.lte('received_at', new Date(`${filters.end}T23:59:59`).toISOString())

  query = query.order('received_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((r) => mapReportRow(r as unknown as ReportRowRaw))
}

export interface AuditLogRow {
  id: string
  action: string
  entity: string
  entity_id: string | null
  user_id: string | null
  user_name: string | null
  ip_address: string | null
  created_at: string
}

export interface AuditFilters {
  action?: string
  entity?: string
  start?: string
  end?: string
  ip?: string
}

export const AUDIT_ENTITIES = [
  'condominiums',
  'buildings',
  'units',
  'residents',
  'staff',
  'packages',
  'third_party_authorizations',
  'profiles',
  'system_settings',
  'whatsapp_messages',
  'notifications',
] as const

/** Logs de auditoria (somente SUPER_ADMIN — RLS), com filtros e paginação. */
export async function listAuditLogs(
  filters: AuditFilters = {},
  opts: { limit?: number; offset?: number } = {},
): Promise<AuditLogRow[]> {
  let query = supabase
    .from('audit_logs')
    .select('id, action, entity, entity_id, user_id, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200)
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 200) - 1)

  if (filters.entity) query = query.eq('entity', filters.entity)
  if (filters.action) query = query.ilike('action', `%${filters.action}%`)
  if (filters.ip) query = query.ilike('ip_address', `%${filters.ip}%`)
  if (filters.start) query = query.gte('created_at', new Date(`${filters.start}T00:00:00`).toISOString())
  if (filters.end) query = query.lte('created_at', new Date(`${filters.end}T23:59:59`).toISOString())

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as {
    id: string
    action: string
    entity: string
    entity_id: string | null
    user_id: string | null
    ip_address: string | null
    created_at: string
  }[]

  const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)))
  let names = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    if (!profErr && profiles) {
      names = new Map(
        (profiles as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]),
      )
    }
  }

  return rows.map((r) => ({
    ...r,
    user_name: r.user_id ? names.get(r.user_id) ?? '—' : null,
  }))
}

/** Logs de auditoria recentes (atalho). */
export async function listRecentAuditLogs(limit = 20): Promise<AuditLogRow[]> {
  return listAuditLogs({}, { limit })
}