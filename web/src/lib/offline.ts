import localforage from 'localforage'
import { uuid } from './utils'

/**
 * Etapa 10.7 — Offline parcial.
 * Armazena rascunhos de encomendas em IndexedDB (localforage) com uma
 * chave de idempotência (UUID) para retentativa segura quando a rede
 * volta.
 */

export interface PackageDraft {
  idempotencyKey: string
  condominiumId: string
  unitId: string | null
  residentId: string | null
  recipientNameRaw: string | null
  carrier: string | null
  trackingCode: string | null
  notes: string | null
  photoDataUrl: string | null
  createdAt: string
}

const store = localforage.createInstance({
  name: 'condominio-encomendas',
  storeName: 'package_drafts',
  description: 'Fila de encomendas aguardando reconexão',
})

export function newIdempotencyKey(): string {
  return uuid()
}

export async function savePackageDraft(
  draft: Omit<PackageDraft, 'idempotencyKey' | 'createdAt'> & { idempotencyKey?: string },
): Promise<string> {
  const key = draft.idempotencyKey ?? newIdempotencyKey()
  await store.setItem(key, {
    ...draft,
    idempotencyKey: key,
    createdAt: new Date().toISOString(),
  } satisfies PackageDraft)
  return key
}

export async function listPackageDrafts(): Promise<PackageDraft[]> {
  const out: PackageDraft[] = []
  await store.iterate<PackageDraft, void>((value) => {
    out.push(value)
  })
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function removePackageDraft(idempotencyKey: string): Promise<void> {
  await store.removeItem(idempotencyKey)
}

export function isNetworkError(err: unknown): boolean {
  const msg = typeof err === 'string'
    ? err
    : (err as { message?: string } | null)?.message ?? ''
  return /network|fetch|failed to fetch|load failed|ERR_INTERNET_DISCONNECTED/i.test(msg)
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}
