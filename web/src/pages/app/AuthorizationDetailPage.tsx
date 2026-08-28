import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthStatusBadge } from '@/components/authorizations/AuthStatusBadge'
import {
  cancelAuthorization,
  effectiveStatus,
  getAuthorization,
  type AuthorizationRecord,
} from '@/features/authorizations/authorizations.service'
import { formatDateTime } from '@/lib/utils'

export default function AuthorizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [auth, setAuth] = useState<AuthorizationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setError(null)
    getAuthorization(id)
      .then((data) => {
        if (active) setAuth(data)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar autorização')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const status = auth ? effectiveStatus(auth) : null

  async function handleCancel() {
    if (!auth || cancelling) return
    setCancelling(true)
    const { data, error } = await cancelAuthorization(auth.id)
    setCancelling(false)
    if (error || !data) {
      toast.error(error ?? 'Não foi possível cancelar.')
      return
    }
    toast.success('Autorização cancelada')
    setAuth(data)
  }

  async function handleShare() {
    if (!auth) return
    const text = `Autorização de retirada de encomenda\nNome: ${auth.authorized_name}\nDocumento: ${auth.authorized_document ?? '—'}\nVálida até: ${formatDateTime(auth.valid_until)}\nCódigo: ${auth.package?.internal_code ?? 'Todas as encomendas pendentes'}`
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Texto copiado para a área de transferência')
    } catch {
      toast.error('Não foi possível copiar o texto')
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={auth?.authorized_name ?? 'Autorização'}
          description="Detalhes da autorização de retirada por terceiro"
          action={
            <div className="flex flex-wrap items-center gap-2">
              {status === 'ACTIVE' && (
                <>
                  <Button variant="outline" onClick={() => void handleShare()}>
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={cancelling}
                    onClick={() => void handleCancel()}
                  >
                    <Ban className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => navigate('/minhas-autorizacoes')}>
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
        ) : !auth || !status ? (
          <EmptyState description="Autorização não encontrada." />
        ) : (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>{auth.authorized_name}</span>
                <AuthStatusBadge status={status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Documento</p>
                <p className="font-medium">{auth.authorized_document ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Encomenda</p>
                <p className="font-medium">
                  {auth.package?.internal_code ?? 'Todas as encomendas pendentes'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Válida de</p>
                <p className="font-medium">{formatDateTime(auth.valid_from)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Válida até</p>
                <p className="font-medium">{formatDateTime(auth.valid_until)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Utilizada em</p>
                <p className="font-medium">{auth.used_at ? formatDateTime(auth.used_at) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cancelada em</p>
                <p className="font-medium">
                  {auth.cancelled_at ? formatDateTime(auth.cancelled_at) : '—'}
                </p>
              </div>
              {auth.observation && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Observação</p>
                  <p className="font-medium">{auth.observation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}