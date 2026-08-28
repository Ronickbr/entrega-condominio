import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShieldCheck } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AuthStatusBadge } from '@/components/authorizations/AuthStatusBadge'
import {
  AUTH_STATUSES,
  effectiveStatus,
  listMyAuthorizations,
  type AuthorizationRecord,
} from '@/features/authorizations/authorizations.service'
import { formatDateTime } from '@/lib/utils'

type TabValue = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'ALL'

export default function AppAuthorizationsPage() {
  const [rows, setRows] = useState<AuthorizationRecord[]>([])
  const [tab, setTab] = useState<TabValue>('ACTIVE')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listMyAuthorizations()
      .then((data) => {
        if (active) setRows(data)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar autorizações')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of AUTH_STATUSES) map.set(s, 0)
    for (const r of rows) {
      const eff = effectiveStatus(r)
      map.set(eff, (map.get(eff) ?? 0) + 1)
    }
    return map
  }, [rows])

  const visible = useMemo(() => {
    if (tab === 'ALL') return rows
    return rows.filter((r) => effectiveStatus(r) === tab)
  }, [rows, tab])

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Autorizações de retirada"
          description="Autorize alguém a retirar suas encomendas por tempo limitado"
          action={
            <Button asChild className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
              <Link to="/minhas-autorizacoes/novo">
                <Plus className="h-4 w-4" />
                Nova autorização
              </Link>
            </Button>
          }
        />

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabValue)}
          items={[
            { value: 'ACTIVE', label: 'Ativas', count: counts.get('ACTIVE') ?? 0 },
            { value: 'USED', label: 'Utilizadas', count: counts.get('USED') ?? 0 },
            { value: 'EXPIRED', label: 'Expiradas', count: counts.get('EXPIRED') ?? 0 },
            { value: 'CANCELLED', label: 'Canceladas', count: counts.get('CANCELLED') ?? 0 },
            { value: 'ALL', label: 'Todas', count: rows.length },
          ]}
        />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} />
        ) : visible.length === 0 ? (
          <EmptyState description="Nenhuma autorização nesta categoria." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((a) => (
              <Link
                key={a.id}
                to={`/minhas-autorizacoes/${a.id}`}
                className="block rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)] p-4 transition-colors hover:border-[hsl(4,84%,56%)]/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-[hsl(0,0%,93%)]">
                      <ShieldCheck className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                      {a.authorized_name}
                    </p>
                    <p className="mt-1 truncate text-sm text-[hsl(0,0%,60%)]">
                      {a.package?.internal_code
                        ? `Encomenda ${a.package.internal_code}`
                        : 'Todas as encomendas pendentes'}
                      {a.authorized_document ? ` · ${a.authorized_document}` : ''}
                    </p>
                  </div>
                  <AuthStatusBadge status={effectiveStatus(a)} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(0,0%,50%)]">
                  <span>Válida até {formatDateTime(a.valid_until)}</span>
                  {a.used_at && <span>Usada em {formatDateTime(a.used_at)}</span>}
                  {a.cancelled_at && <span>Cancelada em {formatDateTime(a.cancelled_at)}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}