import { useEffect, useState } from 'react'
import {
  Clock,
  HardHat,
  Inbox,
  PackageCheck,
  PackageOpen,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { DashboardMetric } from '@/components/dashboard/DashboardMetric'
import { DailyPackagesChart } from '@/components/dashboard/charts/DailyPackagesChart'
import { CarriersBreakdownChart } from '@/components/dashboard/charts/CarriersBreakdownChart'
import { TopUnitsChart } from '@/components/dashboard/charts/TopUnitsChart'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  getDashboardOverview,
  type DashboardOverview,
} from '@/features/dashboard/dashboard.service'

/** Dashboard do síndico: 9 KPIs + 3 gráficos (Etapa 9). */
export default function SyndicDashboardPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!condominium) return
    let active = true
    getDashboardOverview(condominium.id)
      .then((o) => {
        if (active) setOverview(o)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      })
    return () => {
      active = false
    }
  }, [condominium])

  const avgHours =
    overview && overview.avg_hours_to_collect != null
      ? `${overview.avg_hours_to_collect}h`
      : '—'

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={
            condominium ? `Indicadores — ${condominium.name}` : 'Indicadores'
          }
        />

        {condoLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} />
        ) : !overview ? (
          <LoadingState />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardMetric label="Recebidas hoje" value={overview.received_today} icon={PackageOpen} tone="success" />
              <DashboardMetric label="Recebidas (7 dias)" value={overview.received_week} icon={TrendingUp} tone="info" />
              <DashboardMetric label="Recebidas (30 dias)" value={overview.received_period} icon={Inbox} />
              <DashboardMetric label="Pendentes" value={overview.pending_total} icon={Clock} />
              <DashboardMetric
                label="Pendentes > 72h"
                value={overview.pending_72h}
                icon={Timer}
                tone={overview.pending_72h > 0 ? 'danger' : 'default'}
              />
              <DashboardMetric label="Retiradas hoje" value={overview.collected_today} icon={PackageCheck} tone="success" />
              <DashboardMetric label="Tempo médio p/ retirada" value={avgHours} icon={Timer} />
              <DashboardMetric label="Moradores ativos" value={overview.residents_active} icon={Users} />
              <DashboardMetric label="Funcionários ativos" value={overview.staff_active} icon={HardHat} />
            </div>

            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-[hsl(0,0%,93%)]">
                  <TrendingUp className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                  Recebimentos × Retiradas (30 dias)
                </h3>
              </div>
              <div className="p-4">
                <DailyPackagesChart data={overview.daily_timeseries} />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
                <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                  <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Por transportadora</h3>
                </div>
                <div className="p-4">
                  <CarriersBreakdownChart data={overview.carriers_breakdown} />
                </div>
              </div>
              <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
                <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                  <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Unidades com mais encomendas</h3>
                </div>
                <div className="p-4">
                  <TopUnitsChart data={overview.top_units} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
