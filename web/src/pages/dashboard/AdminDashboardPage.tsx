import { useEffect, useState } from 'react'
import { Archive, HardDrive, Inbox, MessageSquareWarning } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { DashboardMetric } from '@/components/dashboard/DashboardMetric'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  getDashboardOverview,
  listRecentAuditLogs,
  type AuditLogRow,
  type DashboardOverview,
} from '@/features/dashboard/dashboard.service'
import { formatDateTime } from '@/lib/utils'

function formatBytes(n: number): string {
  if (!n) return '0 KB'
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

/** Dashboard do Super Admin: KPIs base + falhas WhatsApp + storage + auditoria. */
export default function AdminDashboardPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [audit, setAudit] = useState<AuditLogRow[]>([])
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
    listRecentAuditLogs(20)
      .then((rows) => {
        if (active) setAudit(rows)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [condominium])

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Painel administrativo"
          description={
            condominium ? `Visão global — ${condominium.name}` : 'Visão global'
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DashboardMetric label="Recebidas (7 dias)" value={overview.received_week} icon={Inbox} tone="success" />
              <DashboardMetric label="Pendentes" value={overview.pending_total} icon={Archive} />
              <DashboardMetric
                label="Falhas WhatsApp (7d)"
                value={overview.whatsapp_failed_7d}
                icon={MessageSquareWarning}
                tone={overview.whatsapp_failed_7d > 0 ? 'danger' : 'default'}
              />
              <DashboardMetric
                label="Storage usado"
                value={formatBytes(overview.storage_used_bytes)}
                icon={HardDrive}
              />
            </div>

            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Auditoria recente</h3>
              </div>
              <div>
                {audit.length === 0 ? (
                  <div className="p-8">
                    <EmptyState description="Nenhum evento de auditoria." />
                  </div>
                ) : (
                  <div className="divide-y divide-[hsl(0,0%,20%)]">
                    {audit.map((log) => (
                      <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[hsl(0,0%,93%)]">
                            {log.action} · {log.entity}
                            {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ''}
                          </p>
                          <p className="truncate text-xs text-[hsl(0,0%,60%)]">
                            {log.user_name ?? '—'}
                            {log.ip_address ? ` · ${log.ip_address}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-[hsl(0,0%,50%)]">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    ))}
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
