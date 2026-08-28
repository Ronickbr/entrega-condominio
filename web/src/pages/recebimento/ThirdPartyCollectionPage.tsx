import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, PackageCheck, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PackageStatusBadge } from '@/components/packages/PackageStatusBadge'
import { ThirdPartyAuthorizationLookup } from '@/components/reception/ThirdPartyAuthorizationLookup'
import { ThirdPartyPhotoCapture } from '@/components/reception/ThirdPartyPhotoCapture'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import { confirmCollection } from '@/features/packages/collection.service'
import { listPendingPackages, type PackageListItem } from '@/features/packages/package.service'
import {
  effectiveStatus,
  listOperationalAuthorizations,
  type AuthorizationRecord,
} from '@/features/authorizations/authorizations.service'

type TabValue = 'lookup' | 'normal'

/**
 * Etapa 8 — Retirada por terceiro na portaria:
 *   [1] Buscar autorização por nome/documento → escolhe encomenda pendente.
 *   [2] Fluxo normal: escolhe encomenda → escolhe autorização aplicável.
 * Ambos: captura foto do terceiro e confirma via RPC atômica (THIRD_PARTY).
 */
export default function ThirdPartyCollectionPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [tab, setTab] = useState<TabValue>('normal')
  const [pending, setPending] = useState<PackageListItem[]>([])
  const [loadingPkgs, setLoadingPkgs] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState<PackageListItem | null>(null)
  const [selectedAuth, setSelectedAuth] = useState<AuthorizationRecord | null>(null)
  const [availableAuths, setAvailableAuths] = useState<AuthorizationRecord[]>([])
  const [photoPath, setPhotoPath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!condominium) {
      setLoadingPkgs(false)
      return
    }
    let active = true
    setLoadingPkgs(true)
    listPendingPackages(condominium.id)
      .then((rows) => {
        if (active) setPending(rows)
      })
      .catch((err: unknown) => {
        if (active) toast.error(err instanceof Error ? err.message : 'Erro ao carregar pendências')
      })
      .finally(() => {
        if (active) setLoadingPkgs(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  useEffect(() => {
    if (!selectedPkg) return
    let active = true
    listOperationalAuthorizations({ status: 'ACTIVE' })
      .then((data) => {
        if (!active) return
        const applicable = data.filter(
          (a) =>
            effectiveStatus(a) === 'ACTIVE' &&
            (a.package_id === null || a.package_id === selectedPkg.id),
        )
        setAvailableAuths(applicable)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [selectedPkg])

  const canConfirm = !!selectedPkg && !!selectedAuth && !!photoPath && !submitting

  async function handleConfirm() {
    if (!selectedPkg || !selectedAuth || !photoPath) return
    setSubmitting(true)
    const { data, error } = await confirmCollection(selectedPkg.id, {
      collectionType: 'THIRD_PARTY',
      thirdPartyAuthId: selectedAuth.id,
      photoStoragePath: photoPath,
      authorizedName: selectedAuth.authorized_name,
    })
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }
    if (!data) return
    if (data.success) {
      toast.success(data.message)
      setPending((rows) => rows.filter((p) => p.id !== selectedPkg.id))
      setSelectedPkg(null)
      setSelectedAuth(null)
      setPhotoPath(null)
    } else {
      toast.error(data.message)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Retirada por terceiro"
          description="Autorização do morador + foto do terceiro + confirmação"
          action={
            <Button variant="outline" onClick={() => window.history.back()} className="border-[hsl(0,0%,25%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,18%)]">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          }
        />

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabValue)}
          items={[
            { value: 'normal', label: 'Fluxo normal' },
            { value: 'lookup', label: 'Buscar autorização' },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
              <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">1. Encomenda pendente</h3>
            </div>
            <div className="p-4">
              {condoLoading || loadingPkgs ? (
                <LoadingState />
              ) : pending.length === 0 ? (
                <EmptyState description="Nenhuma encomenda pendente." />
              ) : (
                <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                  {pending.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPkg(p)
                        setSelectedAuth(null)
                        setPhotoPath(null)
                      }}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selectedPkg?.id === p.id
                          ? 'border-[hsl(4,84%,56%)] bg-[hsl(4,84%,56%)]/10'
                          : 'border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] hover:bg-[hsl(0,0%,18%)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[hsl(0,0%,93%)]">{p.internal_code}</p>
                        <p className="truncate text-xs text-[hsl(0,0%,60%)]">
                          {p.resident_name ?? p.recipient_name_raw ?? '—'}
                          {p.unit_label ? ` · ${p.unit_label}` : ''}
                        </p>
                      </div>
                      <PackageStatusBadge status={p.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
            <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
              <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">2. Autorização</h3>
            </div>
            <div className="p-4">
              {tab === 'lookup' ? (
                <ThirdPartyAuthorizationLookup onSelect={setSelectedAuth} />
              ) : (
                <div className="space-y-3">
                  {!selectedPkg ? (
                    <p className="py-6 text-center text-sm text-[hsl(0,0%,50%)]">
                      Selecione uma encomenda primeiro.
                    </p>
                  ) : availableAuths.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[hsl(0,0%,50%)]">
                      Nenhuma autorização ativa para esta encomenda.
                    </p>
                  ) : (
                    <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                      {availableAuths.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedAuth(a)
                            setPhotoPath(null)
                          }}
                          className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                            selectedAuth?.id === a.id
                              ? 'border-[hsl(4,84%,56%)] bg-[hsl(4,84%,56%)]/10'
                              : 'border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] hover:bg-[hsl(0,0%,18%)]'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <UserCheck className="h-4 w-4 shrink-0 text-[hsl(4,84%,56%)]" />
                            <div className="min-w-0">
                              <p className="font-medium text-[hsl(0,0%,93%)]">{a.authorized_name}</p>
                              <p className="truncate text-xs text-[hsl(0,0%,60%)]">
                                {a.authorized_document ?? '—'}
                                {a.package ? ` · ${a.package.internal_code}` : ' · todas'}
                              </p>
                            </div>
                          </div>
                          <PackageStatusBadge status="AGUARDANDO_RETIRADA" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
          <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
            <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">3. Foto do terceiro + confirmação</h3>
          </div>
          <div className="space-y-4 p-4">
            {condominium && (
              <ThirdPartyPhotoCapture
                condominiumId={condominium.id}
                onUploaded={setPhotoPath}
                disabled={!selectedAuth}
              />
            )}

            {selectedPkg && selectedAuth && (
              <div className="rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-[hsl(0,0%,93%)]">
                  <PackageCheck className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                  {selectedPkg.internal_code} → {selectedAuth.authorized_name}
                </p>
                <p className="mt-1 text-xs text-[hsl(0,0%,60%)]">
                  Ao confirmar, a autorização será marcada como utilizada e a encomenda sairá do
                  status de pendência.
                </p>
              </div>
            )}

            <Button
              className="w-full sm:w-auto bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]"
              disabled={!canConfirm}
              onClick={() => void handleConfirm()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando retirada por terceiro...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Confirmar retirada por terceiro
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
