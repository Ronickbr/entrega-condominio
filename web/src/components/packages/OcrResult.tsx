import { useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, Check, Fingerprint, Loader2, PackageCheck, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/cadastros/FormField'
import { ResidentSelector } from '@/components/packages/ResidentSelector'
import { formatCPF, formatPhone } from '@/lib/utils'
import type { ResidentOption } from '@/features/packages/package.service'
import {
  canConfirm,
  lowConfidenceFields,
  LOW_CONFIDENCE_THRESHOLD,
  type OcrEditableField,
  type OcrExtractionResult,
  type OcrMatchCandidate,
} from '@/features/packages/ocr.types'

export interface OcrConfirmValues {
  resident: ResidentOption | null
  recipient_name_raw: string
  carrier: string
  tracking_code: string
  photo?: File | null
}

interface OcrResultProps {
  extraction: OcrExtractionResult
  candidates: OcrMatchCandidate[]
  residents: ResidentOption[]
  busy?: boolean
  onConfirm: (values: OcrConfirmValues) => void | Promise<void>
}

const FIELD_LABELS: Record<OcrEditableField, string> = {
  recipient_name: 'Nome na etiqueta',
  carrier: 'Transportadora',
  tracking_code: 'Código de rastreio',
}

const FIELD_PLACEHOLDERS: Record<OcrEditableField, string> = {
  recipient_name: 'Nome impresso na etiqueta',
  carrier: 'Ex.: Correios',
  tracking_code: 'Ex.: PJ123456789BR',
}

function confidenceBadge(value: number) {
  const low = value < LOW_CONFIDENCE_THRESHOLD
  return (
    <Badge
      variant={low ? 'outline' : 'secondary'}
      className={cn(
        'shrink-0 gap-1',
        low && 'border-amber-400/60 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        !low && 'text-emerald-700 dark:text-emerald-400',
      )}
    >
      {low ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <ShieldCheck className="h-3 w-3" />
      )}
      {Math.round(value * 100)}%
    </Badge>
  )
}

/**
 * Resultado do OCR: campos editáveis com confiança, candidatos por
 * matching e confirmação bloqueada enquanto houver campo < 0.70
 * sem revisão do porteiro.
 */
export function OcrResult({ extraction, candidates, residents, busy, onConfirm }: OcrResultProps) {
  const [values, setValues] = useState<Record<OcrEditableField, string>>({
    recipient_name: extraction.recipient_name ?? '',
    carrier: extraction.carrier ?? '',
    tracking_code: extraction.tracking_code ?? '',
  })
  const [reviewed, setReviewed] = useState<Set<OcrEditableField>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.resident_id ?? null)
  const [manualMode, setManualMode] = useState(false)
  const [manualResident, setManualResident] = useState<ResidentOption | null>(null)

  const lowFields = useMemo(() => lowConfidenceFields(extraction), [extraction])

  const selectedResident = useMemo(() => {
    if (manualMode) return manualResident
    if (!selectedId) return null
    return residents.find((r) => r.resident_id === selectedId) ?? null
  }, [manualMode, manualResident, selectedId, residents])

  const confirmReady =
    canConfirm(extraction, reviewed) && (selectedResident !== null || values.recipient_name.trim() !== '')

  function markReviewed(field: OcrEditableField) {
    setReviewed((prev) => {
      if (prev.has(field)) return prev
      const next = new Set(prev)
      next.add(field)
      return next
    })
  }

  function setField(field: OcrEditableField, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (lowFields.includes(field)) markReviewed(field)
  }

  const info = [
    extraction.unit_number && { label: 'Unidade', value: extraction.unit_number, conf: extraction.confidence.unit_number ?? 0 },
    extraction.building_name && { label: 'Bloco', value: extraction.building_name, conf: extraction.confidence.building_name ?? 0 },
    extraction.cpf && { label: 'CPF', value: formatCPF(extraction.cpf), conf: extraction.confidence.cpf ?? 0 },
    extraction.phone && { label: 'Telefone', value: formatPhone(extraction.phone), conf: extraction.confidence.phone ?? 0 },
    extraction.address && { label: 'Endereço', value: extraction.address, conf: extraction.confidence.address ?? 0 },
    extraction.cep && { label: 'CEP', value: extraction.cep, conf: extraction.confidence.cep ?? 0 },
    extraction.nf && { label: 'NF', value: extraction.nf, conf: extraction.confidence.nf ?? 0 },
    extraction.sku && { label: 'SKU', value: extraction.sku, conf: extraction.confidence.sku ?? 0 },
    extraction.user_code && { label: 'Cód. Usuário', value: extraction.user_code, conf: extraction.confidence.user_code ?? 0 },
  ].filter(Boolean) as Array<{ label: string; value: string; conf: number }>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Campos reconhecidos na etiqueta
        </p>
        <span className="text-xs text-muted-foreground">
          Confiança por campo · revisar quando <span className="font-medium text-amber-600">abaixo de 70%</span>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(FIELD_LABELS) as OcrEditableField[]).map((field) => {
          const conf = extraction.confidence[field] ?? 0
          const low = conf < LOW_CONFIDENCE_THRESHOLD
          const needsReview = low && !reviewed.has(field)
          return (
            <FormField
              key={field}
              label={FIELD_LABELS[field]}
              error={needsReview ? 'Confiança baixa — revise o campo acima.' : undefined}
            >
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={values[field]}
                    onChange={(e) => setField(field, e.target.value)}
                    placeholder={FIELD_PLACEHOLDERS[field]}
                    className={cn(
                      needsReview &&
                        'border-amber-400/70 bg-amber-50/60 focus-visible:ring-amber-400/40 dark:bg-amber-950/30',
                    )}
                  />
                </div>
                {confidenceBadge(conf)}
              </div>
            </FormField>
          )
        })}
      </div>

      {info.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {info.map((i) => (
            <span
              key={i.label}
              className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1 text-xs"
            >
              <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{i.label}:</span>
              <span className="font-medium">{i.value}</span>
              {confidenceBadge(i.conf)}
            </span>
          ))}
        </div>
      )}

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Destinatário provável
        </p>
        {candidates.length > 0 ? (
          <ul className="space-y-2">
            {candidates.slice(0, 3).map((c) => {
              const selected = selectedId === c.resident_id
              return (
                <li key={c.resident_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(c.resident_id)
                      setManualMode(false)
                      setManualResident(null)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                      selected
                        ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-input hover:bg-accent',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">
                        <span className="font-medium">{c.full_name}</span>
                        <span className="ml-2 text-muted-foreground">{c.unit_label}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="hidden gap-1 sm:flex">
                        {c.reasons.slice(0, 2).map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {r}
                          </Badge>
                        ))}
                      </span>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        score {c.score}
                      </Badge>
                    </span>
                  </button>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null)
                  setManualMode(true)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  manualMode ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30' : 'border-input hover:bg-accent',
                )}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                Nenhum, pesquisar manualmente
              </button>
            </li>
          </ul>
        ) : (
          <div className="space-y-3 rounded-md border border-dashed p-4">
            <p className="text-sm text-muted-foreground">Nenhum morador encontrado automaticamente.</p>
            <ResidentSelector
              options={residents}
              value={manualResident}
              onChange={setManualResident}
              disabled={busy}
            />
          </div>
        )}

        {manualMode && (
          <div className="mt-3 rounded-md border p-3">
            <ResidentSelector
              options={residents}
              value={manualResident}
              onChange={setManualResident}
              disabled={busy}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col items-end justify-between gap-2 sm:flex-row">
        {lowFields.length > 0 ? (
          <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Edite os campos destacados para confirmar o recebimento.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Todos os campos reconhecidos com confiança suficiente.</p>
        )}
        <Button
          onClick={() =>
            void onConfirm({
              resident: selectedResident,
              recipient_name_raw: values.recipient_name.trim(),
              carrier: values.carrier.trim(),
              tracking_code: values.tracking_code.trim(),
            })
          }
          disabled={!confirmReady || busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PackageCheck className="h-4 w-4" />
          )}
          Confirmar recebimento
        </Button>
      </div>
    </div>
  )
}
