// Tipos compartilhados do processamento de imagem da etiqueta.

export interface PackageExtractionResult {
  recipient_name: string | null
  unit_number: string | null
  building_name: string | null
  cpf: string | null
  phone: string | null
  carrier: string | null
  tracking_code: string | null
  barcode: string | null
  qr_code: string | null
  // Novos campos para etiqueta Mercado Livre / Correios
  address: string | null
  cep: string | null
  nf: string | null
  sku: string | null
  user_code: string | null
  confidence: Record<string, number> // 0.0 a 1.0 por campo
  raw_result: unknown
}

export interface CandidateResident {
  resident_id: string
  full_name: string
  unit_number: string | null
  building_name: string | null
  cpf: string | null
  phone: string | null
}

export interface MatchResult {
  resident_id: string
  full_name: string
  unit_label: string
  score: number
  reasons: string[]
}

export interface OcrProvider {
  name: 'google_vision' | 'mock'
  /** Texto bruto reconhecido na imagem + confiança por palavra (opcional). */
  extractText(imageBytes: Uint8Array): Promise<{
    text: string
    wordConfidence?: number
    raw: unknown
  }>
}
