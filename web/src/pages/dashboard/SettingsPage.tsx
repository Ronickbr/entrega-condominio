import { useEffect, useState } from 'react'
import { Database, Loader2, Save, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { ConfirmDeleteDialog } from '@/components/cadastros/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import { useAuth } from '@/hooks/useAuth'
import { Role } from '@/types/roles'
import {
  getSystemSettings,
  seedMockupData,
  updateSystemSettings,
  wipeDatabase,
  type SystemSettings,
} from '@/features/settings/settings.service'

/** Configurações do condomínio (super admin/síndico): WhatsApp, lembretes, retenção. */
export default function SettingsPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const { role } = useAuth()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const isSuperAdmin = role === Role.SUPER_ADMIN

  useEffect(() => {
    if (!condominium) return
    let active = true
    getSystemSettings(condominium.id)
      .then((s) => {
        if (active) setSettings(s)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [condominium])

  function patch<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!condominium || !settings) return
    setSaving(true)
    try {
      const updated = await updateSystemSettings(condominium.id, {
        whatsapp_enabled: settings.whatsapp_enabled,
        reminders_enabled: settings.reminders_enabled,
        reminder_24h: settings.reminder_24h,
        reminder_48h: settings.reminder_48h,
        reminder_72h: settings.reminder_72h,
        photo_retention_days: settings.photo_retention_days,
      })
      if (updated) setSettings(updated)
      toast.success('Configurações salvas.')
    } catch {
      toast.error('Não foi possível salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  async function handleWipeDatabase() {
    setWiping(true)
    const result = await wipeDatabase()
    setWiping(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Banco de dados limpo com sucesso!')
    setWipeConfirmOpen(false)
  }

  async function handleSeedMockup() {
    setSeeding(true)
    const result = await seedMockupData()
    setSeeding(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Dados de mockup gerados com sucesso!')
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configurações"
          description="Preferências gerais do condomínio"
          action={
            <Button disabled={!settings || saving} onClick={() => void handleSave()} className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          }
        />

        {condoLoading || !settings ? (
          <LoadingState />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="flex items-center gap-2 border-b border-[hsl(0,0%,20%)] px-4 py-3">
                <Settings className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Notificações</h3>
              </div>
              <div className="space-y-4 p-4">
                <CheckRow
                  label="WhatsApp habilitado"
                  description="Envia avisos de encomenda via WhatsApp (Evolution API)."
                  checked={settings.whatsapp_enabled}
                  onChange={(v) => patch('whatsapp_enabled', v)}
                />
                <CheckRow
                  label="Lembretes habilitados"
                  description="Envia lembretes de encomendas não retiradas."
                  checked={settings.reminders_enabled}
                  onChange={(v) => patch('reminders_enabled', v)}
                />
                <CheckRow
                  label="Lembrete 24h"
                  checked={settings.reminder_24h}
                  onChange={(v) => patch('reminder_24h', v)}
                />
                <CheckRow
                  label="Lembrete 48h"
                  checked={settings.reminder_48h}
                  onChange={(v) => patch('reminder_48h', v)}
                />
                <CheckRow
                  label="Lembrete 72h"
                  checked={settings.reminder_72h}
                  onChange={(v) => patch('reminder_72h', v)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
              <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Retenção de dados</h3>
              </div>
              <div className="p-4">
                <Label htmlFor="retention" className="text-[hsl(0,0%,80%)]">Dias para reter fotos</Label>
                <Input
                  id="retention"
                  type="number"
                  min={1}
                  value={settings.photo_retention_days}
                  onChange={(e) =>
                    patch('photo_retention_days', Math.max(1, Number(e.target.value) || 1))
                  }
                  className="mt-1 w-40"
                />
                <p className="mt-2 text-xs text-[hsl(0,0%,50%)]">
                  Fotos de etiquetas/terceiros com mais de {settings.photo_retention_days} dias são
                  removidas pela rotina de limpeza.
                </p>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="rounded-xl border border-[hsl(4,84%,56%)]/30 bg-[hsl(4,84%,56%)]/5 lg:col-span-2">
                <div className="flex items-center gap-2 border-b border-[hsl(4,84%,56%)]/20 px-4 py-3">
                  <Database className="h-4 w-4 text-[hsl(4,84%,56%)]" />
                  <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Área Restrita do Administrador do Sistema</h3>
                </div>
                <div className="space-y-4 p-4">
                  <p className="text-sm text-[hsl(0,0%,60%)]">
                    Ferramentas destrutivas de banco de dados. Use com extremo cuidado. Essas ações afetam todos os condomínios cadastrados.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => void handleSeedMockup()}
                      disabled={seeding}
                      variant="outline"
                      className="border-[hsl(0,0%,25%)] bg-[hsl(0,0%,15%)] text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,20%)]"
                    >
                      {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                      Gerar dados de mockup
                    </Button>
                    <Button
                      onClick={() => setWipeConfirmOpen(true)}
                      disabled={wiping}
                      className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar todo o banco de dados
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDeleteDialog
        open={wipeConfirmOpen}
        onOpenChange={setWipeConfirmOpen}
        title="Limpar banco de dados?"
        description="Esta ação é IRREVERSÍVEL e removerá TODOS os condomínios, blocos, unidades, moradores, encomendas, autorizações, auditorias e logs do sistema. Tem certeza absoluta que deseja prosseguir?"
        onConfirm={() => void handleWipeDatabase()}
        loading={wiping}
      />
    </AppLayout>
  )
}

function CheckRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,15%)] p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-[hsl(4,84%,56%)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block font-medium text-[hsl(0,0%,93%)]">{label}</span>
        {description && <span className="block text-sm text-[hsl(0,0%,50%)]">{description}</span>}
      </span>
    </label>
  )
}
