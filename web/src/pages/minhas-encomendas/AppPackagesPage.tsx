import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, X } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PackageCard } from '@/components/packages/PackageCard'
import { PackageStatus } from '@/features/packages/package.types'
import { listMyPackages, type PackageListItem } from '@/features/packages/package.service'

export default function AppPackagesPage() {
  const [tab, setTab] = useState<'pending' | 'history'>('pending')
  const [packages, setPackages] = useState<PackageListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem('justSignedUp') === '1',
  )

  function dismissWelcome() {
    sessionStorage.removeItem('justSignedUp')
    setShowWelcome(false)
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listMyPackages()
      .then((rows) => {
        if (active) setPackages(rows)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar encomendas')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const pending = useMemo(
    () => packages.filter((p) => p.status === PackageStatus.AGUARDANDO_RETIRADA),
    [packages],
  )
  const history = useMemo(
    () => packages.filter((p) => p.status !== PackageStatus.AGUARDANDO_RETIRADA),
    [packages],
  )

  const rows = tab === 'pending' ? pending : history

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Minhas encomendas" description="Encomendas recebidas para você" />

        {showWelcome && (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Home className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Cadastro concluído. Bem-vindo!</p>
                <p className="text-muted-foreground">
                  Adicione os demais moradores do seu apartamento para que seus nomes sejam
                  reconhecidos nas encomendas.
                </p>
                <Button asChild variant="link" className="h-auto p-0 text-primary">
                  <Link to="/meu-apartamento">Adicionar moradores do apartamento</Link>
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fechar aviso"
              onClick={dismissWelcome}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as 'pending' | 'history')}
          items={[
            { value: 'pending', label: 'Pendentes', count: pending.length },
            { value: 'history', label: 'Histórico', count: history.length },
          ]}
        />

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState description={error} />
        ) : rows.length === 0 ? (
          <EmptyState description={tab === 'pending' ? 'Você não tem encomendas pendentes.' : 'Nenhuma encomenda no histórico.'} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((p) => (
              <PackageCard key={p.id} pkg={p} href={`/minhas-encomendas/${p.id}`} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}