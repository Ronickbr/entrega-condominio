import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import {
  createAuthorization,
  listMyAuthorizations,
  type AuthorizationRecord,
} from '@/features/authorizations/authorizations.service'
import { listMyPackages } from '@/features/packages/package.service'

const VALIDITY_DEFAULT_H = 48
const VALIDITY_MAX_H = 24 * 7

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function NewAuthorizationPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [authorizedName, setAuthorizedName] = useState('')
  const [document, setDocument] = useState('')
  const [observation, setObservation] = useState('')
  const [packageId, setPackageId] = useState<string>('ALL')
  const [validUntil, setValidUntil] = useState('')
  const [existing, setExisting] = useState<AuthorizationRecord[]>([])
  const [packages, setPackages] = useState<{ id: string; internal_code: string }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const maxUntil = useMemo(() => Date.now() + VALIDITY_MAX_H * 60 * 60 * 1000, [])
  const minUntil = useMemo(() => Date.now() + 60 * 60 * 1000, [])

  useEffect(() => {
    const def = new Date(Date.now() + VALIDITY_DEFAULT_H * 60 * 60 * 1000)
    setValidUntil(toLocalInputValue(def))
    listMyAuthorizations()
      .then(setExisting)
      .catch(() => undefined)
    listMyPackages()
      .then((p) =>
        setPackages(
          p
            .filter((x) => x.status === 'AGUARDANDO_RETIRADA' || x.status === 'NAO_IDENTIFICADA')
            .map((x) => ({ id: x.id, internal_code: x.internal_code })),
        ),
      )
      .catch(() => undefined)
  }, [])

  const maxPendingPackages = existing.filter((a) => a.package_id === null && a.status === 'ACTIVE')
  const canUseAll = maxPendingPackages.length === 0

  async function handleSubmit() {
    if (!authorizedName.trim()) {
      toast.error('Informe o nome do terceiro autorizado.')
      return
    }
    const until = new Date(validUntil).getTime()
    if (Number.isNaN(until)) {
      toast.error('Informe uma data de validade.')
      return
    }
    if (until < minUntil || until > maxUntil) {
      toast.error('Validade deve ser entre 1 hora e 7 dias a partir de agora.')
      return
    }
    if (packageId === 'ALL' && !canUseAll) {
      toast.error('Você já tem uma autorização ativa para todas as encomendas.')
      return
    }

    setSubmitting(true)
    const { data, error } = await createAuthorization({
      package_id: packageId === 'ALL' ? null : packageId,
      authorized_name: authorizedName.trim(),
      authorized_document: document.trim() || null,
      observation: observation.trim() || null,
      valid_until: new Date(until).toISOString(),
    })
    setSubmitting(false)

    if (error || !data) {
      toast.error(error ?? 'Erro ao criar autorização.')
      return
    }
    toast.success('Autorização criada')
    navigate(`/minhas-autorizacoes/${data.id}`)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Nova autorização"
          description={`Autorize um terceiro a retirar encomendas${profile ? ` do perfil de ${profile.full_name}` : ''}`}
          action={
            <Button variant="outline" onClick={() => navigate('/minhas-autorizacoes')}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          }
        />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">Dados do autorizado</CardTitle>
            <CardDescription>
              A autorização vale por até 7 dias. Após usada ou cancelada, não pode ser reutilizada.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Nome do terceiro *</Label>
              <Input
                id="name"
                value={authorizedName}
                onChange={(e) => setAuthorizedName(e.target.value)}
                placeholder="Ex.: Maria das Graças"
                autoFocus
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="doc">Documento (opcional)</Label>
              <Input
                id="doc"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="CPF ou RG — facilita a busca na portaria"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pkg">Encomenda</Label>
              <Select
                id="pkg"
                className="w-full"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                <option value="ALL" disabled={!canUseAll}>
                  Todas as encomendas pendentes
                </option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.internal_code}
                  </option>
                ))}
              </Select>
              {packageId === 'ALL' && !canUseAll && (
                <p className="mt-1 text-xs text-destructive">
                  Você já possui uma autorização ativa para todas as encomendas.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="until">Validade (máx. 7 dias)</Label>
              <Input
                id="until"
                type="datetime-local"
                value={validUntil}
                min={toLocalInputValue(new Date(minUntil))}
                max={toLocalInputValue(new Date(maxUntil))}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea
                id="obs"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={2}
                placeholder="Ex.: Buscar também quando eu não estiver em casa"
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => navigate('/minhas-autorizacoes')}>
                Cancelar
              </Button>
              <Button disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Criar autorização
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}