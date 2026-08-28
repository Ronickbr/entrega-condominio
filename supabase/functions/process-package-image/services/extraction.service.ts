// Extração de campos da etiqueta a partir do texto OCR.
// Módulo puro (sem dependências Deno/Supabase) — testável com Node.
import type { PackageExtractionResult } from '../types.ts'

const KEYWORDS = new Set([
  'apto',
  'apartamento',
  'ap',
  'bloco',
  'torre',
  'unidade',
  'casa',
  'andar',
  'cpf',
  'cnpj',
  'destinatario',
  'remetente',
  'rua',
  'avenida',
  'av',
  'bairro',
  'cep',
  'cidade',
  'telefone',
  'fone',
  'tel',
  'transportadora',
  'rastreio',
  'correios',
  'pac',
  'sedex',
  'shopping',
  'condominio',
  'conjunto',
  'grupo',
  'encomenda',
  'expressa',
  'entrega',
  'envio',
  'aviso',
  'pacote',
  'postagem',
])

/** Remove acentos e normaliza para comparação. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const NAME_TOKEN = /[A-ZÀ-Ú][A-Za-zÀ-Úà-úç']+|[A-Z](?:\.[A-Z]?)?/
const RE_NAME_LINE = new RegExp(`^${NAME_TOKEN.source}(?:[ ]${NAME_TOKEN.source}){1,5}$`)
const RE_DESTINATARIO = new RegExp(
  `(?:destinatario|destinataria|nome|para)\\s*[:\\-]\\s*(${NAME_TOKEN.source}(?:[ ]${NAME_TOKEN.source}){1,5})`,
  'i',
)
const RE_UNIT = /(?:apto|ap|apartamento|unidade|torre|casa)\.?\s*(?:n[oa]?\.?\s*)?([0-9]{1,4}[A-Za-z]?)/i
const RE_BUILDING = /(?:bloco|torre)\s*\.?\s*([A-Z0-9]{1,4})(?!\d)/i
const RE_CPF = /\b([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2})\b/
const RE_PHONE = /(?:\(?[0-9]{2}\)?\s?)?[0-9]{4,5}-?[0-9]{4}/
const RE_TRACK_CORREIOS = /\b([A-Z]{2}[0-9]{9}BR)\b/i
const RE_TRACK_NUMERIC = /\b([0-9]{13,16})\b/
const RE_BARCODE = /\b[0-9]{12,14}\b/

// Novos padrões para etiqueta Mercado Livre / Correios
const RE_NF = /(?:nf|nota fiscal|n[úu]mero da nota)[:\s]*(\d{6,15})/i
const RE_SKU = /sku[:\s]*(\d+)/i
const RE_CEP = /cep[:\s]*(\d{5}-?\d{3})/i
const RE_USER_NAME = /(?:usuario|usu[aá]rio)\s+(?:teste\s+)?(.+?)(?:\s*\(|$)/i
const RE_USER_CODE = /\(([A-Z0-9]+)\)/
const RE_ADDRESS_LINE = /(?:endere[çc]o|rua|av|avenida|alameda|travessa|rodovia)[:\s]*(.+)/i
const RE_DESPACHAR = /despachar[:\s]*(.+)/i
const RE_VENDA = /venda[:\s]*(\d+)/i
const RE_QUANTIDADE = /quantidade[:\s]*(\d+)/i
const RE_NOME_PRODUTO = /nome[:\s]*(.+)/i

function cleanCPF(raw: string): string {
  return raw.replace(/[.\-\s]/g, '')
}

function cleanPhone(raw: string): string {
  return raw.replace(/[\s()\-]/g, '')
}

function cleanCEP(raw: string): string {
  return raw.replace(/[.\-\s]/g, '')
}

/** Heurística de nome: prefixo "Destinatario:" ou linha limpa com 2+ palavras. */
function detectName(lines: string[], text: string): { name: string; confidence: number } | null {
  // Tentar "Usuário" pattern primeiro (etiqueta Mercado Livre)
  const userMatch = text.match(RE_USER_NAME)
  if (userMatch) {
    const name = userMatch[1].trim()
    if (name.length >= 3) return { name, confidence: 0.85 }
  }

  const dest = text.match(RE_DESTINATARIO)
  if (dest) return { name: dest[1].trim(), confidence: 0.8 }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 5 || trimmed.length > 60) continue
    if (!RE_NAME_LINE.test(trimmed)) continue
    const tokens = trimmed.split(/\s+/)
    const lower = trimmed.toLowerCase()
    if (tokens.some((t) => KEYWORDS.has(normalizeText(t)))) continue
    if (lower.includes('eletronico') || lower.includes('envio')) continue
    const words = tokens.filter((t) => /^[A-ZÀ-Ú]/.test(t)).length
    const confidence = words >= 2 ? 0.68 : 0.6
    return { name: trimmed, confidence }
  }
  return null
}

function detectCarrier(text: string, trackingCode: string | null): {
  carrier: string | null
  confidence: number
} {
  const lower = text.toLowerCase()
  if (RE_TRACK_CORREIOS.test(text) && trackingCode && /^[A-Z]{2}\d{9}BR$/i.test(trackingCode)) {
    return { carrier: 'Correios', confidence: 0.98 }
  }
  if (/\bmagalu|magazine\b/.test(lower)) return { carrier: 'Magazine Luiza', confidence: 0.95 }
  if (/\bmercado.?livre|mercado envios\b/.test(lower)) return { carrier: 'Mercado Livre', confidence: 0.95 }
  if (/\bshopee\b/.test(lower)) return { carrier: 'Shopee', confidence: 0.95 }
  if (/\bamazon\b/.test(lower)) return { carrier: 'Amazon', confidence: 0.95 }
  if (/\bcorreios\b/.test(lower)) return { carrier: 'Correios', confidence: 0.95 }
  if (trackingCode && /^\d{13,16}$/.test(trackingCode)) {
    return { carrier: null, confidence: 0.5 }
  }
  return { carrier: null, confidence: 0 }
}

function detectAddress(text: string, lines: string[]): {
  address: string | null
  confidence: number
} {
  // Tentar padrão de endereço explícito
  const addrMatch = text.match(RE_ADDRESS_LINE)
  if (addrMatch) {
    const addr = addrMatch[1].trim()
    if (addr.length >= 5) return { address: addr, confidence: 0.85 }
  }

  // Tentar encontrar linha com "Rua", "Av", etc.
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^(?:rua|av|avenida|alameda|travessa|rodovia)\s/i.test(trimmed)) {
      if (trimmed.length >= 10 && trimmed.length <= 100) {
        return { address: trimmed, confidence: 0.75 }
      }
    }
  }

  return { address: null, confidence: 0 }
}

function detectCEP(text: string): { cep: string | null; confidence: number } {
  const match = text.match(RE_CEP)
  if (match) return { cep: cleanCEP(match[1]), confidence: 0.95 }

  // Fallback: buscar CEP no formato 00000-000 ou 00000000
  const fallback = text.match(/\b(\d{5}-?\d{3})\b/)
  if (fallback) return { cep: cleanCEP(fallback[1]), confidence: 0.8 }

  return { cep: null, confidence: 0 }
}

function detectNF(text: string): { nf: string | null; confidence: number } {
  const match = text.match(RE_NF)
  if (match) return { nf: match[1], confidence: 0.9 }

  // Fallback: buscar "NF:" seguido de números
  const fallback = text.match(/nf[:\s]*(\d{6,15})/i)
  if (fallback) return { nf: fallback[1], confidence: 0.85 }

  return { nf: null, confidence: 0 }
}

function detectSKU(text: string): { sku: string | null; confidence: number } {
  const match = text.match(RE_SKU)
  if (match) return { sku: match[1], confidence: 0.9 }
  return { sku: null, confidence: 0 }
}

function detectUserCode(text: string): { code: string | null; confidence: number } {
  const match = text.match(RE_USER_CODE)
  if (match) return { code: match[1], confidence: 0.85 }
  return { code: null, confidence: 0 }
}

/**
 * Extrai campos estruturados do texto OCR da etiqueta.
 * `raw_result` SEMPRE acompanha o resultado (critério de pronto).
 */
export function extractFromText(text: string): PackageExtractionResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const unitMatch = text.match(RE_UNIT)
  const buildingMatch = text.match(RE_BUILDING)
  const cpfMatch = text.match(RE_CPF)
  const phoneMatch = text.match(RE_PHONE)
  const trackCorreios = text.match(RE_TRACK_CORREIOS)
  const trackNumeric = text.match(RE_TRACK_NUMERIC)
  const barcode = text.match(RE_BARCODE)

  const trackingCode = trackCorreios?.[1] ?? trackNumeric?.[1] ?? null
  const carrierInfo = detectCarrier(text, trackingCode)
  const nameInfo = detectName(lines, text)
  const addressInfo = detectAddress(text, lines)
  const cepInfo = detectCEP(text)
  const nfInfo = detectNF(text)
  const skuInfo = detectSKU(text)
  const userCodeInfo = detectUserCode(text)

  return {
    recipient_name: nameInfo?.name ?? null,
    unit_number: unitMatch?.[1]?.toUpperCase() ?? null,
    building_name: buildingMatch?.[1]?.toUpperCase() ?? null,
    cpf: cpfMatch ? cleanCPF(cpfMatch[1]) : null,
    phone: phoneMatch ? cleanPhone(phoneMatch[0]) : null,
    carrier: carrierInfo.carrier,
    tracking_code: trackingCode,
    barcode: barcode?.[1] ?? null,
    qr_code: null,
    // Novos campos para etiqueta Mercado Livre
    address: addressInfo.address,
    cep: cepInfo.cep,
    nf: nfInfo.nf,
    sku: skuInfo.sku,
    user_code: userCodeInfo.code,
    confidence: {
      recipient_name: nameInfo?.confidence ?? 0,
      unit_number: unitMatch ? 0.88 : 0,
      building_name: buildingMatch ? 0.85 : 0,
      cpf: cpfMatch ? 0.98 : 0,
      phone: phoneMatch ? 0.9 : 0,
      carrier: carrierInfo.confidence,
      tracking_code: trackingCode ? 0.95 : 0,
      barcode: barcode ? 0.9 : 0,
      qr_code: 0,
      address: addressInfo.confidence,
      cep: cepInfo.confidence,
      nf: nfInfo.confidence,
      sku: skuInfo.confidence,
      user_code: userCodeInfo.confidence,
    },
    raw_result: { text },
  }
}
