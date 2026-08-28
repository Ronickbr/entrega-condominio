import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { compressImage, uuid } from '@/lib/utils'

interface ThirdPartyPhotoCaptureProps {
  condominiumId: string
  onUploaded: (path: string) => void
  disabled?: boolean
}

/**
 * Captura a foto do terceiro (Etapa 8) e envia ao bucket third-party-photos.
 * O nome do objeto é `<condominioId>/<uuid>.jpeg` (1º segmento = condomínio,
 * compatível com a policy RLS) e o path completo (`third-party-photos/...`)
 * é devolvido via onUploaded para gravar em photo_storage_path.
 */
export function ThirdPartyPhotoCapture({
  condominiumId,
  onUploaded,
  disabled,
}: ThirdPartyPhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [path, setPath] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 } },
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

  async function handleFile(file: File) {
    setPath(null)
    setUploading(true)
    const blob = file.size > 2 * 1024 * 1024 ? await compressImage(file) : file
    const name = `${condominiumId}/${uuid()}.jpeg`
    const { error } = await supabase.storage
      .from('third-party-photos')
      .upload(name, blob, { contentType: 'image/jpeg' })
    setUploading(false)
    if (error) {
      setPreview(null)
      return
    }
    const fullPath = `third-party-photos/${name}`
    setPreview(URL.createObjectURL(blob))
    setPath(fullPath)
    onUploaded(fullPath)
  }

  function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) void handleFile(new File([blob], `terceiro-${Date.now()}.jpeg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview)
    stopCamera()
    setPreview(null)
    setPath(null)
    fileRef.current?.form?.reset()
    void startCamera()
  }

  return (
    <div className="space-y-3">
      {path && preview ? (
        <div className="space-y-2">
          <img src={preview} alt="Foto do terceiro" className="h-40 w-full rounded-md border object-cover" />
          <p className="text-xs text-emerald-600">Foto anexada e enviada.</p>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            <Trash2 className="h-4 w-4" />
            Trocar foto
          </Button>
        </div>
      ) : cameraError ? (
        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          <Camera className="mx-auto mb-1 h-6 w-6 opacity-40" />
          Câmera indisponível. Anexe a foto do terceiro abaixo.
          <div className="mt-2">
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

      {!path && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={capture}
            disabled={!ready || uploading || disabled}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Fotografar terceiro
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || disabled}
          >
            <ImagePlus className="h-4 w-4" />
            Escolher arquivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}