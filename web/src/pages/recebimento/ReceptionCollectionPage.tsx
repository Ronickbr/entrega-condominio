import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, PackageCheck, Search } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PackageStatusBadge } from '@/components/packages/PackageStatusBadge'
import { CollectionModal } from '@/components/packages/CollectionModal'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import { listPendingPackages, type PackageListItem } from '@/features/packages/package.service'
import type { CollectionResult } from '@/features/packages/collection.service'

/**
 * Etapa 7 — Página dedicada de retiradas: busca por código/rastreio/destinatário
 * entre as pendências e confirma a entrega (RPC atômica, prevenção duplicada).
 */
export default function ReceptionCollectionPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [pending, setPending] = useState<PackageListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PackageListItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!condominium) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    listPendingPackages(condominium.id)
      .then((rows) => {
        if (active) setPending(rows)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar pendências')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pending
    return pending.filter((p) =>
      [p.internal_code, p.carrier, p.tracking_code, p.resident_name, p.unit_label, p.recipient_name_raw]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [pending, search])

  function handleCollected(result: CollectionResult) {
    setPending((rows) => rows.filter((p) => p.id !== selected?.id))
    toast.success(result.message)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Confirmar retiradas"
          description="Busque a encomenda entre as pendências e confirme a entrega ao morador"
          action={
            <Button variant="outline" onClick={() => window.history.back()} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          }
        />

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,50%)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, rastreio, destinatário..."
            className="pl-8"
          />
        </div>

        {loading || condoLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState description={search ? 'Nenhuma pendência corresponde à busca.' : 'Nenhuma encomenda pendente de retirada.'} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((p) => (
              <div key={p.id} className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[hsl(0,0%,93%)]">{p.internal_code}</p>
                    <p className="mt-1 truncate text-sm text-[hsl(0,0%,60%)]">
                      {p.resident_name ?? p.recipient_name_raw ?? 'Destinatário desconhecido'}
                      {p.unit_label ? ` · ${p.unit_label}` : ''}
                    </p>
                    <p className="mt-1 truncate text-xs text-[hsl(0,0%,50%)]">
                      {p.carrier ?? '—'}
                      {p.tracking_code ? ` · Rastreio: ${p.tracking_code}` : ''}
                    </p>
                  </div>
                  <PackageStatusBadge status={p.status} />
                </div>
                <Button
                  className="mt-4 w-full bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]"
                  onClick={() => {
                    setSelected(p)
                    setModalOpen(true)
                  }}
                >
                  <PackageCheck className="h-4 w-4" />
                  Confirmar entrega
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CollectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        pkg={selected}
        onCollected={handleCollected}
      />
    </AppLayout>
  )
}
