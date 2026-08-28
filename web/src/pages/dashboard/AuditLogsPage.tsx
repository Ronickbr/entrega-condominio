import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  AUDIT_ENTITIES,
  listAuditLogs,
  type AuditFilters,
  type AuditLogRow,
} from '@/features/dashboard/dashboard.service'
import { formatDateTime } from '@/lib/utils'

/** Auditoria completa (super admin): filtros + listagem server-side. */
export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>({})
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    listAuditLogs(filters, { limit: 200 })
      .then((data) => {
        if (active) setRows(data)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters])

  const hasFilter = Object.values(filters).some(Boolean)

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Auditoria" description="Histórico de operações do sistema" />

        <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
          <div className="flex items-center gap-2 border-b border-[hsl(0,0%,20%)] px-6 py-4">
            <ShieldCheck className="h-5 w-5 text-[hsl(4,84%,56%)]" />
            <h3 className="text-base font-medium text-[hsl(0,0%,93%)]">Filtros</h3>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="a-entity">Entidade</Label>
              <Select
                id="a-entity"
                value={filters.entity ?? ''}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value || undefined })}
              >
                <option value="">Todas</option>
                {AUDIT_ENTITIES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="a-action">Ação</Label>
              <Input
                id="a-action"
                value={filters.action ?? ''}
                placeholder="INSERT, UPDATE, DELETE, PACKAGE_COLLECTED..."
                onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="a-start">Início</Label>
              <Input
                id="a-start"
                type="date"
                value={filters.start ?? ''}
                onChange={(e) => setFilters({ ...filters, start: e.target.value || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="a-end">Fim</Label>
              <Input
                id="a-end"
                type="date"
                value={filters.end ?? ''}
                onChange={(e) => setFilters({ ...filters, end: e.target.value || undefined })}
              />
            </div>
            <div>
              <Label htmlFor="a-ip">IP</Label>
              <Input
                id="a-ip"
                value={filters.ip ?? ''}
                placeholder="Ex.: 192.168."
                onChange={(e) => setFilters({ ...filters, ip: e.target.value || undefined })}
              />
            </div>
            {hasFilter && (
              <div className="flex items-end">
                <Button variant="ghost" onClick={() => setFilters({})} className="text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,18%)]">
                  Limpar
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
          <div className="border-b border-[hsl(0,0%,20%)] px-6 py-4">
            <h3 className="text-base font-medium text-[hsl(0,0%,93%)]">Registros ({rows.length})</h3>
          </div>
          <div className="p-6">
            {loading ? (
              <LoadingState />
            ) : rows.length === 0 ? (
              <EmptyState description="Nenhum registro de auditoria." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(0,0%,20%)] text-left text-xs">
                      <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Ação</th>
                      <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Entidade</th>
                      <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Usuário</th>
                      <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">IP</th>
                      <th className="py-2 font-medium text-[hsl(0,0%,60%)]">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((log) => (
                      <tr key={log.id} className="border-b border-[hsl(0,0%,18%)] last:border-0 hover:bg-[hsl(0,0%,15%)]">
                        <td className="py-2 pr-3 font-medium text-[hsl(0,0%,93%)]">{log.action}</td>
                        <td className="py-2 pr-3 text-[hsl(0,0%,80%)]">
                          {log.entity}
                          {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ''}
                        </td>
                        <td className="py-2 pr-3 text-[hsl(0,0%,80%)]">{log.user_name ?? '—'}</td>
                        <td className="py-2 pr-3 text-[hsl(0,0%,60%)]">{log.ip_address ?? '—'}</td>
                        <td className="py-2 text-[hsl(0,0%,60%)]">{formatDateTime(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
