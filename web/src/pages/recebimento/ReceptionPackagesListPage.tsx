import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageCheck, Plus, Search, UserCheck } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Tabs } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PackageCard } from '@/components/packages/PackageCard'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  listPackages,
  listPendingPackages,
  type PackageListItem,
} from '@/features/packages/package.service'

export default function ReceptionPackagesListPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<PackageListItem[]>([])
  const [all, setAll] = useState<PackageListItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    if (!condominium) {
      setDataLoading(false)
      return
    }
    let active = true
    setDataLoading(true)
    setDataError(null)
    Promise.all([listPendingPackages(condominium.id), listPackages(condominium.id)])
      .then(([p, a]) => {
        if (!active) return
        setPending(p)
        setAll(a)
      })
      .catch((err: unknown) => {
        if (active) setDataError(err instanceof Error ? err.message : 'Erro ao carregar encomendas')
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  const rows = tab === 'pending' ? pending : all

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((p) =>
      [
        p.internal_code,
        p.carrier,
        p.tracking_code,
        p.resident_name,
        p.unit_label,
        p.recipient_name_raw,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [rows, search])

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Encomendas"
          description="Pendências e histórico de encomendas do condomínio"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
                <Link to="/recebimento/terceiros">
                  <UserCheck className="h-4 w-4" />
                  Retirada por terceiro
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
                <Link to="/recebimento/retirada">
                  <PackageCheck className="h-4 w-4" />
                  Confirmar retiradas
                </Link>
              </Button>
              <Button asChild disabled={!condominium || condoLoading} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
                <Link to="/recebimento/novo">
                  <Plus className="h-4 w-4" />
                  Nova encomenda
                </Link>
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as 'pending' | 'all')}
            items={[
              { value: 'pending', label: 'Pendências', count: pending.length },
              { value: 'all', label: 'Todas', count: all.length },
            ]}
          />
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,50%)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar encomenda..."
              className="pl-8 border-[hsl(0,0%,25%)] bg-[hsl(0,0%,13%)] text-[hsl(0,0%,93%)] placeholder:text-[hsl(0,0%,40%)]"
            />
          </div>
        </div>

        {dataLoading || condoLoading ? (
          <LoadingState />
        ) : dataError ? (
          <ErrorState description={dataError} />
        ) : filtered.length === 0 ? (
          <EmptyState description={tab === 'pending' ? 'Nenhuma encomenda pendente.' : 'Nenhuma encomenda encontrada.'} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((p) => (
              <PackageCard key={p.id} pkg={p} href={`/recebimento/${p.id}`} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
