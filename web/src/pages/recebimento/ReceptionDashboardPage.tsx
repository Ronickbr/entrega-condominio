import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, PackageCheck, PackageOpen, AlertTriangle } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { DashboardMetric } from '@/components/dashboard/DashboardMetric'
import { PackageStatusBadge } from '@/components/packages/PackageStatusBadge'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  getDashboardOverview,
  type DashboardOverview,
} from '@/features/dashboard/dashboard.service'
import { listPendingPackages, type PackageListItem } from '@/features/packages/package.service'
import { timeAgo } from '@/lib/utils'

const HOUR = 3600 * 1000

function ageInfo(receivedAt: string): { label: string; tone: 'default' | 'warning' | 'danger' } {
  const age = Date.now() - new Date(receivedAt).getTime()
  const hours = Math.max(0, Math.floor(age / HOUR))
  if (hours > 72) {
    return { label: `${hours}h`, tone: 'danger' }
  }
  if (hours > 48) {
    return { label: `${hours}h`, tone: 'warning' }
  }
  if (hours > 24) {
    return { label: `${hours}h`, tone: 'warning' }
  }
  return { label: `${hours}h`, tone: 'default' }
}

/** Dashboard do porteiro: 4 KPIs + top 10 pendências mais antigas. */
export default function ReceptionDashboardPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [pending, setPending] = useState<PackageListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!condominium) return
    let active = true
    setLoading(true)
    Promise.all([
      getDashboardOverview(condominium.id),
      listPendingPackages(condominium.id),
    ])
      .then(([ov, pkgs]) => {
        if (!active) return
        setOverview(ov)
        setPending(pkgs)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  const oldest = useMemo(
    () => [...pending].sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()).slice(0, 10),
    [pending],
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Portaria"
          description={
            condominium ? `Visão geral da portaria — ${condominium.name}` : 'Visão geral da portaria'
          }
        />

        {condoLoading || loading ? (
          <LoadingState />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardMetric
                label="Recebidas hoje"
                value={overview?.received_today ?? 0}
                icon={PackageOpen}
                tone="success"
              />
              <DashboardMetric
                label="Aguardando retirada"
                value={overview?.pending_total ?? 0}
                icon={Inbox}
              />
              <DashboardMetric
                label="Retiradas hoje"
                value={overview?.collected_today ?? 0}
                icon={PackageCheck}
                tone="info"
              />
              <DashboardMetric
                label="Pendentes > 72h"
                value={overview?.pending_72h ?? 0}
                icon={AlertTriangle}
                tone={overview && overview.pending_72h > 0 ? 'danger' : 'default'}
              />
            </div>

            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Pendências mais antigas</h3>
              </div>
              <div>
                {oldest.length === 0 ? (
                  <div className="p-8">
                    <EmptyState description="Nenhuma encomenda pendente." />
                  </div>
                ) : (
                  <div className="divide-y divide-[hsl(0,0%,20%)]">
                    {oldest.map((p) => {
                      const age = ageInfo(p.received_at)
                      return (
                        <Link
                          key={p.id}
                          to={`/recebimento/${p.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[hsl(0,0%,16%)]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="text-xs font-medium text-[hsl(0,0%,60%)]">
                              {age.label}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[hsl(0,0%,93%)]">{p.internal_code}</p>
                              <p className="truncate text-xs text-[hsl(0,0%,60%)]">
                                {p.resident_name ?? p.recipient_name_raw ?? '—'}
                                {p.unit_label ? ` · ${p.unit_label}` : ''}
                                {p.received_at ? ` · ${timeAgo(p.received_at)}` : ''}
                              </p>
                            </div>
                          </div>
                          <PackageStatusBadge status={p.status} />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
