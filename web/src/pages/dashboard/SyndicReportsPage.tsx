import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { PackageFilters } from '@/components/dashboard/PackageFilters'
import { Button } from '@/components/ui/button'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  listReportPackages,
  type ReportFilters,
  type ReportPackageRow,
} from '@/features/dashboard/dashboard.service'
import { PACKAGE_STATUS_LABELS } from '@/features/packages/package.types'
import { formatDateTime } from '@/lib/utils'

const HEADERS = [
  'Código',
  'Status',
  'Recebida em',
  'Retirada em',
  'Morador',
  'Unidade',
  'Transportadora',
  'Rastreio',
  'Tipo retirada',
  'Recebido por',
  'Retirado por',
  'Observações',
]

const COLLECTION_LABELS: Record<string, string> = {
  RESIDENT: 'Morador',
  THIRD_PARTY: 'Terceiro autorizado',
}

const STATUS_LABELS = PACKAGE_STATUS_LABELS as Record<string, string>

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s
}

function csvCell(v: string): string {
  if (/[";\r\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`
  return v
}

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(';')).join('\r\n')
}

/** Relatório do síndico com filtros + exportação CSV (pt-BR, UTF-8 BOM). */
export default function SyndicReportsPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [filters, setFilters] = useState<ReportFilters>({})
  const [rows, setRows] = useState<ReportPackageRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!condominium) return
    let active = true
    setLoading(true)
    listReportPackages(condominium.id, filters)
      .then((data) => {
        if (active) setRows(data)
      })
      .catch((err: unknown) => {
        if (active) toast.error(err instanceof Error ? err.message : 'Erro ao carregar relatório')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium, filters])

  async function handleExport() {
    const csvRows: string[][] = [
      HEADERS,
      ...rows.map((r) => [
        r.internal_code,
        statusLabel(r.status),
        formatDateTime(r.received_at),
        formatDateTime(r.collected_at),
        r.resident_name ?? '—',
        r.unit_label ?? '—',
        r.carrier ?? '—',
        r.tracking_code ?? '—',
        COLLECTION_LABELS[r.collection_type ?? ''] ?? r.collection_type ?? '—',
        r.received_by_name ?? '—',
        r.collected_by_name ?? '—',
        r.notes ?? '—',
      ]),
    ]
    const csv = '\uFEFF' + toCsv(csvRows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-encomendas-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success(`${rows.length} registro(s) exportado(s).`)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Relatórios"
          description="Exporte as encomendas do condomínio em CSV"
          action={
            <Button onClick={() => void handleExport()} disabled={rows.length === 0} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          }
        />

        {condoLoading ? (
          <LoadingState />
        ) : (
          <>
            <PackageFilters
              condominiumId={condominium?.id ?? ''}
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters({})}
            />

            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="flex items-center gap-2 border-b border-[hsl(0,0%,20%)] px-6 py-4">
                <FileSpreadsheet className="h-5 w-5 text-[hsl(4,84%,56%)]" />
                <h3 className="text-base font-medium text-[hsl(0,0%,93%)]">
                  Resultado ({rows.length})
                </h3>
              </div>
              <div className="p-6">
                {loading ? (
                  <LoadingState />
                ) : rows.length === 0 ? (
                  <EmptyState description="Nenhuma encomenda com os filtros selecionados." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(0,0%,20%)] text-left text-xs">
                          <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Código</th>
                          <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Status</th>
                          <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Morador</th>
                          <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Unidade</th>
                          <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Transportadora</th>
                          <th className="py-2 pr-3 font-medium text-[hsl(0,0%,60%)]">Recebida em</th>
                          <th className="py-2 font-medium text-[hsl(0,0%,60%)]">Retirada em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 100).map((r) => (
                          <tr key={`${r.internal_code}-${r.received_at}`} className="border-b border-[hsl(0,0%,18%)] last:border-0 hover:bg-[hsl(0,0%,15%)]">
                            <td className="py-2 pr-3 font-medium text-[hsl(0,0%,93%)]">{r.internal_code}</td>
                            <td className="py-2 pr-3 text-[hsl(0,0%,80%)]">{statusLabel(r.status)}</td>
                            <td className="py-2 pr-3 text-[hsl(0,0%,80%)]">{r.resident_name ?? '—'}</td>
                            <td className="py-2 pr-3 text-[hsl(0,0%,80%)]">{r.unit_label ?? '—'}</td>
                            <td className="py-2 pr-3 text-[hsl(0,0%,80%)]">{r.carrier ?? '—'}</td>
                            <td className="py-2 pr-3 text-[hsl(0,0%,60%)]">{formatDateTime(r.received_at)}</td>
                            <td className="py-2 text-[hsl(0,0%,60%)]">{formatDateTime(r.collected_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 100 && (
                      <p className="mt-2 text-xs text-[hsl(0,0%,50%)]">
                        Exibindo 100 de {rows.length} registros. O CSV exporta todos.
                      </p>
                    )}
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
