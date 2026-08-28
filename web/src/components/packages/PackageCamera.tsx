import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PackageCameraProps {
  onCapture: (file: File) => void
  disabled?: boolean
}

/**
 * Captura de foto da etiqueta via câmera (getUserMedia), com fallback
 * para seleção de arquivo. O snapshot é produzido em JPEG.
 */
export function PackageCamera({ onCapture, disabled }: PackageCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
    } catch {
      setCameraError(true)
    }
  }, [])

  useEffect(() => {
    void startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  async function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    setBusy(true)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        setBusy(false)
        if (blob) onCapture(new File([blob], `etiqueta-${Date.now()}.jpeg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <div className="space-y-4">
      {cameraError ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Camera className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Câmera indisponível. Anexe uma foto da etiqueta abaixo.
          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => void startCamera()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border bg-black">
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-contain" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void capture()}
          disabled={!ready || busy || disabled}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Fotografar etiqueta
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy || disabled}
        >
          <ImagePlus className="h-4 w-4" />
          Escolher arquivo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onCapture(f)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
