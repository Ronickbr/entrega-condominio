/**
 * Tipos compartilhados do fluxo OCR (Etapa 5).
 * Os campos espelham a interface `PackageExtractionResult` da edge function.
 */

export const LOW_CONFIDENCE_THRESHOLD = 0.7

export interface OcrExtractionResult {
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
  confidence: Record<string, number>
}

export interface OcrMatchCandidate {
  resident_id: string
  full_name: string
  unit_label: string
  score: number
  reasons: string[]
}

export interface OcrScanResponse {
  extraction: OcrExtractionResult
  candidates: OcrMatchCandidate[]
  extraction_id: string | null
}

export const OCR_EDITABLE_FIELDS = ['recipient_name', 'carrier', 'tracking_code'] as const
export type OcrEditableField = (typeof OCR_EDITABLE_FIELDS)[number]

/** Campos editáveis cuja confiança está abaixo do limite de revisão. */
export function lowConfidenceFields(
  extraction: OcrExtractionResult,
): OcrEditableField[] {
  return OCR_EDITABLE_FIELDS.filter(
    (f) => (extraction.confidence[f] ?? 0) < LOW_CONFIDENCE_THRESHOLD,
  )
}

/**
 * Confirmação de recebimento só é liberada quando TODOS os campos com
 * confiança < 0.70 já foram revisados (interação do porteiro).
 */
export function canConfirm(
  extraction: OcrExtractionResult,
  reviewedFields: ReadonlySet<OcrEditableField>,
): boolean {
  return lowConfidenceFields(extraction).every((f) => reviewedFields.has(f))
}
