import { useEffect, useMemo, useState } from 'react'
import { Loader2, MessageSquareText, RefreshCw, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  listWhatsappMessages,
  requeueWhatsappMessage,
  WHATSAPP_STATUSES,
  type WhatsappMessageRecord,
} from '@/features/notifications/whatsapp.service'

const STATUS_STYLE: Record<string, string> = {
  QUEUED: 'bg-[hsl(0,0%,20%)] text-[hsl(0,0%,80%)]',
  SENT: 'bg-[hsl(200,80%,15%)] text-[hsl(200,80%,60%)]',
  DELIVERED: 'bg-[hsl(152,58%,15%)] text-[hsl(152,58%,50%)]',
  READ: 'bg-[hsl(210,60%,15%)] text-[hsl(210,60%,55%)]',
  FAILED: 'bg-[hsl(4,84%,18%)] text-[hsl(4,84%,56%)]',
}

/**
 * Logs de envio WhatsApp (SUPER_ADMIN/SYNDIC). Filtro por status e
 * reenvio de mensagens falhas.
 */
export default function WhatsAppLogsPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [items, setItems] = useState<WhatsappMessageRecord[]>([])
  const [loading, setLoading] = useState(true)

  const filtered = useMemo(
    () => (statusFilter === 'all' ? items : items.filter((m) => m.status === statusFilter)),
    [items, statusFilter],
  )

  async function load() {
    if (!condominium) return
    setLoading(true)
    try {
      setItems(await listWhatsappMessages(condominium.id))
    } catch {
      toast.error('Erro ao carregar logs de WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [condominium])

  async function resend(messageId: string) {
    const ok = await requeueWhatsappMessage(messageId)
    if (ok) {
      toast.success('Mensagem reenfileirada (QUEUED)')
      void load()
    } else {
      toast.error('Não foi possível reenviar a mensagem')
    }
  }

  const failures = items.filter((m) => m.status === 'FAILED').length

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Logs de WhatsApp"
          description="Rastreabilidade dos envios de notificação aos moradores"
          action={
            <Button variant="outline" onClick={() => void load()} disabled={loading || condoLoading} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          }
        />

        <div className="flex items-center gap-2 text-sm">
          <MessageSquareText className="h-4 w-4 text-[hsl(0,0%,50%)]" />
          <span className="text-[hsl(0,0%,60%)]">{items.length} mensagens no total</span>
          {failures > 0 && (
            <Badge variant="destructive" className="ml-1">
              {failures} falha{failures > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={setStatusFilter}
          items={[
            { value: 'all', label: 'Todas' },
            ...WHATSAPP_STATUSES.map((s) => ({
              value: s,
              label: s.charAt(0) + s.slice(1).toLowerCase(),
            })),
          ]}
        />

        {loading ? (
          <div className="flex justify-center py-12 text-[hsl(0,0%,50%)]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="py-12 text-center text-sm text-[hsl(0,0%,50%)]">
              Nenhuma mensagem neste filtro.
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(0,0%,20%)]">
                    <th className="h-10 px-4 text-left font-medium text-[hsl(0,0%,60%)]">Telefone</th>
                    <th className="h-10 px-4 text-left font-medium text-[hsl(0,0%,60%)]">Tipo</th>
                    <th className="h-10 px-4 text-left font-medium text-[hsl(0,0%,60%)]">Conteúdo</th>
                    <th className="h-10 px-4 text-left font-medium text-[hsl(0,0%,60%)]">Status</th>
                    <th className="h-10 px-4 text-left font-medium text-[hsl(0,0%,60%)]">Tentativas</th>
                    <th className="h-10 px-4 text-left font-medium text-[hsl(0,0%,60%)]">Criada em</th>
                    <th className="h-10 px-4 text-right font-medium text-[hsl(0,0%,60%)]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-[hsl(0,0%,18%)] hover:bg-[hsl(0,0%,15%)]">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[hsl(0,0%,93%)]">{m.phone}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[hsl(0,0%,80%)]">{m.message_type}</td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-xs text-[hsl(0,0%,60%)]">
                        {m.content}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[m.status]}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[hsl(0,0%,80%)]">
                        {m.attempts}/{m.max_attempts}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[hsl(0,0%,60%)]">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.status === 'FAILED' ? (
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="max-w-[180px] truncate text-[11px] text-[hsl(4,84%,56%)]"
                              title={m.last_error ?? ''}
                            >
                              {m.last_error ?? 'Falha'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void resend(m.id)}
                              title="Voltar para a fila (QUEUED)"
                              className="text-[hsl(0,0%,80%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,18%)]"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reenviar
                            </Button>
                          </div>
                        ) : (
                          <span className="block text-right text-[11px] text-[hsl(0,0%,50%)]">
                            {m.sent_at ? formatDateTime(m.sent_at) : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
