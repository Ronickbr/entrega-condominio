import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import {
  CONSENT_TYPES,
  listMyConsents,
  setConsent,
  submitExclusionRequest,
  type ConsentType,
} from '@/features/settings/settings.service'

const CONSENT_META: Record<ConsentType, { label: string; description: string }> = {
  DATA_USAGE: {
    label: 'Uso de dados',
    description: 'Autoriza o condomínio a usar seus dados para a gestão de encomendas.',
  },
  WHATSAPP_NOTIFICATIONS: {
    label: 'Notificações por WhatsApp',
    description: 'Receber avisos de encomenda no WhatsApp.',
  },
  APP_NOTIFICATIONS: {
    label: 'Notificações no aplicativo',
    description: 'Receber notificações internas do aplicativo.',
  },
  THIRD_PARTY_PHOTO: {
    label: 'Foto de terceiro autorizado',
    description: 'Permite registrar a foto de quem retira encomendas em seu nome.',
  },
}

/** Página de privacidade (morador): consentimentos LGPD + exclusão de dados. */
export default function PrivacyPage() {
  const { profile } = useAuth()
  const [consents, setConsents] = useState<Partial<Record<ConsentType, boolean>>>({})
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    let active = true
    listMyConsents()
      .then((rows) => {
        if (!active) return
        const map: Partial<Record<ConsentType, boolean>> = {}
        for (const c of CONSENT_TYPES) map[c] = false
        for (const row of rows) map[row.consent_type] = row.granted
        setConsents(map)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function toggle(type: ConsentType, next: boolean) {
    if (!profile) return
    setConsents((prev) => ({ ...prev, [type]: next }))
    try {
      await setConsent(profile.id, type, next)
      toast.success(next ? 'Consentimento concedido' : 'Consentimento revogado')
    } catch {
      setConsents((prev) => ({ ...prev, [type]: !next }))
      toast.error('Não foi possível atualizar o consentimento.')
    }
  }

  async function handleExclusion() {
    if (!profile) return
    setRequesting(true)
    try {
      await submitExclusionRequest(profile.id)
      toast.success('Solicitação de exclusão enviada.')
    } catch {
      toast.error('Não foi possível enviar a solicitação.')
    } finally {
      setRequesting(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader title="Privacidade" description="Gerencie seus consentimentos (LGPD)" />

        <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
          <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-[hsl(0,0%,93%)]">
              <ShieldCheck className="h-5 w-5 text-[hsl(4,84%,56%)]" />
              Consentimentos
            </h3>
          </div>
          <div className="space-y-3 p-4">
            {loading ? (
              <LoadingState />
            ) : (
              CONSENT_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] p-3 transition-colors hover:bg-[hsl(0,0%,18%)]"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-[hsl(4,84%,56%)]"
                    checked={consents[type] ?? false}
                    onChange={(e) => void toggle(type, e.target.checked)}
                  />
                  <span>
                    <span className="block font-medium text-[hsl(0,0%,93%)]">{CONSENT_META[type].label}</span>
                    <span className="block text-sm text-[hsl(0,0%,60%)]">
                      {CONSENT_META[type].description}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
          <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
            <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Seus dados</h3>
          </div>
          <div className="flex flex-col items-start gap-2 p-4">
            <Label className="text-sm text-[hsl(0,0%,60%)]">
              Solicite a exclusão dos seus dados pessoais. A solicitação será analisada pela
              administração.
            </Label>
            <Button variant="destructive" disabled={requesting} onClick={() => void handleExclusion()}>
              {requesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Solicitar exclusão de dados
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
