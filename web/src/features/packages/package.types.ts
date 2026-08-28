/**
 * Entidades de encomendas (Etapa 4).
 * Sincronizado com o enum public.package_status (migration 0006).
 */

export const PackageStatus = {
  RECEBIDA: 'RECEBIDA',
  AGUARDANDO_RETIRADA: 'AGUARDANDO_RETIRADA',
  RETIRADA: 'RETIRADA',
  RETIRADA_POR_TERCEIRO: 'RETIRADA_POR_TERCEIRO',
  NAO_IDENTIFICADA: 'NAO_IDENTIFICADA',
  DEVOLVIDA: 'DEVOLVIDA',
  CANCELADA: 'CANCELADA',
} as const

export type PackageStatus = (typeof PackageStatus)[keyof typeof PackageStatus]

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  [PackageStatus.RECEBIDA]: 'Recebida',
  [PackageStatus.AGUARDANDO_RETIRADA]: 'Aguardando retirada',
  [PackageStatus.RETIRADA]: 'Retirada',
  [PackageStatus.RETIRADA_POR_TERCEIRO]: 'Retirada por terceiro',
  [PackageStatus.NAO_IDENTIFICADA]: 'Não identificada',
  [PackageStatus.DEVOLVIDA]: 'Devolvida',
  [PackageStatus.CANCELADA]: 'Cancelada',
}

/** Status exibidos como "pendências" na portaria. */
export const PENDING_STATUSES: ReadonlySet<PackageStatus> = new Set([
  PackageStatus.AGUARDANDO_RETIRADA,
  PackageStatus.NAO_IDENTIFICADA,
])

export function isPackageStatus(value: unknown): value is PackageStatus {
  return (
    typeof value === 'string' &&
    Object.values(PackageStatus).includes(value as PackageStatus)
  )
}

/** Imagem da encomenda (public.package_images) */
export interface PackageImageRecord {
  id: string
  package_id: string
  storage_path: string
  image_type: string
  created_by: string | null
  created_at: string
}

/** Evento da timeline (public.package_events) */
export interface PackageEventRecord {
  id: string
  package_id: string
  event_type: string
  payload: Record<string, unknown>
  user_id: string | null
  user_name: string | null
  created_at: string
}

export const PACKAGE_EVENT_LABELS: Record<string, string> = {
  PACKAGE_CREATED: 'Encomenda cadastrada',
  PACKAGE_RECEIVED: 'Recebida na portaria',
  RESIDENT_MATCHED: 'Morador identificado',
  WHATSAPP_SENT: 'Notificação WhatsApp enviada',
  WHATSAPP_FAILED: 'Falha no envio do WhatsApp',
  REMINDER_SENT: 'Lembrete enviado',
  THIRD_PARTY_AUTHORIZED: 'Retirada por terceiro autorizada',
  PACKAGE_COLLECTED: 'Retirada pelo morador',
  PACKAGE_COLLECTED_BY_THIRD_PARTY: 'Retirada por terceiro',
  PACKAGE_RETURNED: 'Devolvida à transportadora',
  PACKAGE_CANCELLED: 'Cancelada',
}