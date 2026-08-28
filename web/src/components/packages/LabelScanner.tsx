import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, FileSearch, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PackageCamera } from '@/components/packages/PackageCamera'
import { OcrResult, type OcrConfirmValues } from '@/components/packages/OcrResult'
import { scanLabelImage, uploadLabelImage, type ResidentOption } from '@/features/packages/package.service'
import type { OcrScanResponse } from '@/features/packages/ocr.types'

interface LabelScannerProps {
  condominiumId: string
  residents: ResidentOption[]
  busy?: boolean
  onConfirm: (values: OcrConfirmValues) => void | Promise<void>
}

type ScanPhase = 'idle' | 'uploading' | 'scanning' | 'result' | 'error'

/**
 * Fluxo completo da câmera: captura → upload (Storage temp) → edge
 * function (OCR + matching) → resultado. Falhas de OCR exibem
 * mensagem amigável (sem detalhes técnicos).
 */
export function LabelScanner({ condominiumId, residents, busy, onConfirm }: LabelScannerProps) {
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [result, setResult] = useState<OcrScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const capturedFileRef = useRef<File | null>(null)

  const handleCapture = useCallback(
    async (file: File) => {
      setError(null)
      setResult(null)
      capturedFileRef.current = file
      setPhase('uploading')

      const storagePath = await uploadLabelImage(condominiumId, file)
      if (!storagePath) {
        setError('Não foi possível enviar a imagem. Tente novamente.')
        setPhase('error')
        return
      }

      setPhase('scanning')
      const res = await scanLabelImage(storagePath)
      if (res.error || !res.data) {
        setError(res.error ?? 'Não foi possível analisar a etiqueta.')
        setPhase('error')
        return
      }

      setResult(res.data)
      setPhase('result')
    },
    [condominiumId],
  )

  function reset() {
    setPhase('idle')
    setResult(null)
    setError(null)
  }

  if (phase === 'result' && result) {
    return (
      <OcrResult
        extraction={result.extraction}
        candidates={result.candidates}
        residents={residents}
        busy={busy}
        onConfirm={(values) => onConfirm({ ...values, photo: capturedFileRef.current })}
      />
    )
  }

  if (phase === 'uploading' || phase === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(4,84%,56%)]" />
        <p className="text-sm font-medium text-[hsl(0,0%,93%)]">
          {phase === 'uploading' ? 'Enviando imagem...' : 'Analisando etiqueta (OCR + matching)...'}
        </p>
        <p className="text-xs text-[hsl(0,0%,60%)]">Isso leva alguns segundos.</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/60 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">Falha ao analisar a imagem</p>
            <p className="mt-1 text-amber-200">{error}</p>
            <p className="mt-1 text-xs text-amber-400/80">
              Aproxime a câmera da etiqueta, evite reflexos e fotografe com boa iluminação.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={reset} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(0,0%,60%)]">
            <FileSearch className="h-3.5 w-3.5" />
            Ou cadastre manualmente na aba "Manual".
          </span>
        </div>
      </div>
    )
  }

  return (
    <PackageCamera
      onCapture={(file) => void handleCapture(file)}
      disabled={busy}
    />
  )
}
