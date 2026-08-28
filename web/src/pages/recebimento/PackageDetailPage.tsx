import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileImage, Info, PackageCheck, Truck } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { PackageStatusBadge } from '@/components/packages/PackageStatusBadge'
import { PackageTimeline } from '@/components/packages/PackageTimeline'
import { CollectionModal } from '@/components/packages/CollectionModal'
import { formatDateTime } from '@/lib/utils'
import { PENDING_STATUSES } from '@/features/packages/package.types'
import {
  getPackage,
  getSignedImageUrl,
  listPackageEvents,
  listPackageImages,
  type PackageListItem,
} from '@/features/packages/package.service'
import type { PackageEventRecord } from '@/features/packages/package.types'
import type { CollectionResult } from '@/features/packages/collection.service'

export default function PackageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState<PackageListItem | null>(null)
  const [images, setImages] = useState<{ path: string; url: string | null }[]>([])
  const [events, setEvents] = useState<PackageEventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collectionOpen, setCollectionOpen] = useState(false)

  async function reload() {
    if (!id) return
    const pkgData = await getPackage(id)
    const evts = await listPackageEvents(id)
    setPkg(pkgData)
    setEvents(evts)
  }

  function handleCollected(_result: CollectionResult) {
    void reload()
  }

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
        const urls = await Promise.all(
          imgs.map(async (img) => ({
            path: img.storage_path,
            url: await getSignedImageUrl(img.storage_path),
          })),
        )
        if (active) setImages(urls)
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
          description="Detalhes do recebimento e histórico"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {pkg && PENDING_STATUSES.has(pkg.status) && (
                <Button onClick={() => setCollectionOpen(true)} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
                  <PackageCheck className="h-4 w-4" />
                  Confirmar entrega
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate('/recebimento')} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </div>
          }
        />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} />
        ) : !pkg ? (
          <EmptyState description="Encomenda não encontrada ou sem acesso." />
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
                  <p className="text-xs text-[hsl(0,0%,50%)]">Destinatário</p>
                  <p className="font-medium text-[hsl(0,0%,93%)]">
                    {pkg.resident_name ?? pkg.recipient_name_raw ?? 'Não identificado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(0,0%,50%)]">Unidade</p>
                  <p className="font-medium text-[hsl(0,0%,93%)]">{pkg.unit_label ?? '—'}</p>
                </div>
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
                  <p className="font-medium text-[hsl(0,0%,93%)]">
                    {formatDateTime(pkg.received_at)}
                    {pkg.received_by_name ? ` · ${pkg.received_by_name}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[hsl(0,0%,50%)]">Retirada em</p>
                  <p className="font-medium text-[hsl(0,0%,93%)]">
                    {pkg.collected_at ? formatDateTime(pkg.collected_at) : '—'}
                    {pkg.collected_by_name ? ` · ${pkg.collected_by_name}` : ''}
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
                              <Truck className="mr-2 h-4 w-4" />
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

      <CollectionModal
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
        pkg={pkg}
        onCollected={handleCollected}
      />
    </AppLayout>
  )
}
