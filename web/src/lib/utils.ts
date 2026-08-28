import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Remove todos os caracteres não numéricos (para CPF, CNPJ, telefone, CEP).
 */
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '')
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function formatCPF(raw: string | null | undefined): string {
  const d = onlyDigits(raw).slice(0, 11)
  if (!d) return ''
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

/**
 * Retorna CPF mascarado parcialmente: ***.***.***-00
 * (Últimos 2 dígitos e dígito verificador visíveis, oculta primeiros 9).
 */
export function maskCPF(raw: string | null | undefined): string {
  const d = onlyDigits(raw).slice(0, 11)
  if (d.length < 11) return formatCPF(d)
  return `***.***.***-${d.slice(9, 11)}`
}

/**
 * Máscara de celular brasileiro: (00) 00000-0000  (suporta também fixo)
 */
export function formatPhone(raw: string | null | undefined): string {
  const d = onlyDigits(raw).slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/**
 * Valida formato básico de e-mail (não valida existência real).
 */
export function isValidEmail(email: string | null | undefined): boolean {
  const v = (email ?? '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

/**
 * Valida CPF por dígitos verificadores.
 */
export function isValidCPF(raw: string | null | undefined): boolean {
  const d = onlyDigits(raw)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false

  const calc = (len: number) => {
    let s = 0
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(raw: string | null | undefined): string {
  const d = onlyDigits(raw).slice(0, 14)
  if (!d) return ''
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/**
 * Valida CNPJ por dígitos verificadores.
 */
export function isValidCNPJ(raw: string | null | undefined): boolean {
  const d = onlyDigits(raw)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  const calc = (weights: number[]): number => {
    let s = 0
    weights.forEach((w, i) => {
      s += Number(d[i]) * w
    })
    const r = s % 11
    return r < 2 ? 0 : 11 - r
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  return calc(w1) === Number(d[12]) && calc(w2) === Number(d[13])
}

/**
 * Gera UUID v4 rápido (crypto.randomUUID se disponível).
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Compacta e redimensiona uma imagem via canvas antes de upload (Storage).
 * Retorna Blob JPEG com qualidade padrão 0.82.
 */
export async function compressImage(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string } = {},
): Promise<Blob> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.82, mimeType = 'image/jpeg' } = opts
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1)
  const w = Math.round(bitmap.width * ratio)
  const h = Math.round(bitmap.height * ratio)
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível para compressão')
  ctx.drawImage(bitmap, 0, 0, w, h)
  return await canvas.convertToBlob({ type: mimeType, quality })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Formata timestamp ISO em "dd/mm/aaaa hh:mm" (pt-BR). */
export function formatDateTime(raw: string | null | undefined): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Formata timestamp ISO em "dd/mm/aaaa" (pt-BR). */
export function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Tempo relativo amigável: "há 2 dias", "há 3 horas". */
export function timeAgo(raw: string | null | undefined): string {
  if (!raw) return '—'
  const then = new Date(raw).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'agora mesmo'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `há ${months} mes${months > 1 ? 'es' : ''}`
  return `há ${Math.floor(months / 12)} ano(s)`
}
