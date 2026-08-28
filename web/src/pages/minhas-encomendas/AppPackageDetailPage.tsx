import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileImage, Info, UserCheck } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { PackageStatusBadge } from '@/components/packages/PackageStatusBadge'
import { PackageTimeline } from '@/components/packages/PackageTimeline'
import { formatDateTime } from '@/lib/utils'
import {
  getPackage,
  getSignedImageUrl,
  listPackageEvents,
  listPackageImages,
  type PackageListItem,
} from '@/features/packages/package.service'
import type { PackageEventRecord } from '@/features/packages/package.types'

export default function AppPackageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState<PackageListItem | null>(null)
  const [images, setImages] = useState<{ path: string; url: string | null }[]>([])
  const [events, setEvents] = useState<PackageEventRecord[]>([])
  const [thirdParty, setThirdParty] = useState<{
    name: string
    photoUrl: string | null
    collectedAt: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([getPackage(id), listPackageImages(id), listPackageEvents(id)])
      .then(async ([pkgData, imgs, evts]) => {
        if (!active) return
        setPkg(pkgData)
        setEvents(evts)

        let thirdPartyData: typeof thirdParty = null
        const tpEvent = evts.find((e) => e.event_type === 'PACKAGE_COLLECTED_BY_THIRD_PARTY')
        if (tpEvent) {
          const name =
            typeof tpEvent.payload.authorized_name === 'string'
              ? tpEvent.payload.authorized_name
              : 'Terceiro autorizado'
          const photoPath =
            typeof tpEvent.payload.photo_storage_path === 'string'
              ? tpEvent.payload.photo_storage_path
              : null
          const photoUrl = photoPath ? await getSignedImageUrl(photoPath) : null
          thirdPartyData = { name, photoUrl, collectedAt: tpEvent.created_at }
        }

        const urls = await Promise.all(
          imgs.map(async (img) => ({
            path: img.storage_path,
            url: await getSignedImageUrl(img.storage_path),
          })),
        )
        if (active) {
          setImages(urls)
          setThirdParty(thirdPartyData)
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar encomenda')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={pkg?.internal_code ?? 'Encomenda'}
          description="Acompanhe o status e o histórico da sua encomenda"
          action={
            <Button variant="outline" onClick={() => navigate('/minhas-encomendas')} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          }
        />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} />
        ) : !pkg ? (
          <EmptyState description="Encomenda não encontrada." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="flex items-center justify-between border-b border-[hsl(0,0%,20%)] px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-[hsl(0,0%,93%)]">
                  <Info className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                  Dados
                </span>
                <PackageStatusBadge status={pkg.status} />
              </div>
              <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[hsl(0,0%,50%)]">Transportadora</p>
                  <p className="font-medium text-[hsl(0,0%,93%)]">{pkg.carrier ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(0,0%,50%)]">Rastreio</p>
                  <p className="font-medium text-[hsl(0,0%,93%)]">{pkg.tracking_code ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(0,0%,50%)]">Recebida em</p>
                  <p className="font-medium text-[hsl(0,0%,93%)]">{formatDateTime(pkg.received_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(0,0%,50%)]">Retirada em</p>
                  <p className="font-medium text-[hsl(0,0%,93%)]">
                    {pkg.collected_at ? formatDateTime(pkg.collected_at) : '—'}
                  </p>
                </div>
                {pkg.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-[hsl(0,0%,50%)]">Observações</p>
                    <p className="font-medium text-[hsl(0,0%,93%)]">{pkg.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {thirdParty && (
                <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
                  <div className="flex items-center gap-2 border-b border-[hsl(0,0%,20%)] px-4 py-3">
                    <UserCheck className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                    <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Retirada por terceiro</h3>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs text-[hsl(0,0%,50%)]">Recebido por</p>
                      <p className="font-medium text-[hsl(0,0%,93%)]">{thirdParty.name}</p>
                      {thirdParty.collectedAt && (
                        <p className="text-xs text-[hsl(0,0%,50%)]">
                          {formatDateTime(thirdParty.collectedAt)}
                        </p>
                      )}
                    </div>
                    {thirdParty.photoUrl && (
                      <img
                        src={thirdParty.photoUrl}
                        alt={`Foto de ${thirdParty.name}`}
                        loading="lazy"
                        decoding="async"
                        className="h-40 w-full rounded-lg border border-[hsl(0,0%,20%)] object-cover"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
                <div className="flex items-center gap-2 border-b border-[hsl(0,0%,20%)] px-4 py-3">
                  <FileImage className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                  <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Fotos</h3>
                </div>
                <div className="p-4">
                  {images.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[hsl(0,0%,50%)]">
                      Nenhuma foto anexada.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {images.map((img, i) => (
                        <div
                          key={`${img.path}-${i}`}
                          className="overflow-hidden rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)]"
                        >
                          {img.url ? (
                            <img
                              src={img.url}
                              alt={`Foto ${i + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="h-40 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-[hsl(0,0%,50%)]">
                              Foto indisponível
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
                <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                  <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Timeline</h3>
                </div>
                <div className="p-4">
                  <PackageTimeline events={events} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
