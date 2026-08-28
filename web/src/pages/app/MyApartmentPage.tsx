import { useCallback, useEffect, useState } from 'react'
import { Home, KeyRound, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import {
  addHouseholdMember,
  getMyResidentRecord,
  getMyUnit,
  listHouseholdMembers,
  updateMyPin,
  type HouseholdMember,
  type MyUnit,
} from '@/features/residents/household.service'
import { formatPhone, onlyDigits } from '@/lib/utils'

export default function MyApartmentPage() {
  const { profile } = useAuth()
  const [unit, setUnit] = useState<MyUnit | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [residentRecord, setResidentRecord] = useState<{ id: string; pin_code: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const [u, m, r] = await Promise.all([
      getMyUnit(profile.id).catch(() => null),
      listHouseholdMembers().catch(() => []),
      getMyResidentRecord(profile.id).catch(() => null),
    ])
    setUnit(u)
    setMembers(m)
    setResidentRecord(r)
    if (r?.pin_code) {
      setPinValue(r.pin_code)
    }
    setLoading(false)
  }, [profile])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd() {
    if (!unit || !name.trim()) return
    setSaving(true)
    const { error } = await addHouseholdMember(unit.id, name, onlyDigits(phone))
    setSaving(false)
    if (error) {
      toast.error('Não foi possível adicionar o morador.')
      return
    }
    toast.success('Morador adicionado')
    setName('')
    setPhone('')
    void load()
  }

  async function handleSavePin() {
    if (!residentRecord) return
    if (pinValue.length !== 4 || !/^\d{4}$/.test(pinValue)) {
      toast.error('O PIN deve conter exatamente 4 dígitos numéricos')
      return
    }
    setSavingPin(true)
    const { error } = await updateMyPin(residentRecord.id, pinValue)
    setSavingPin(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('PIN atualizado com sucesso!')
    void load()
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Meu apartamento"
          description={
            unit
              ? `${unit.building_name ?? 'Bloco'} · Apartamento ${unit.number}`
              : 'Seu apartamento'
          }
        />

        {loading ? (
          <LoadingState />
        ) : !unit ? (
          <EmptyState description="Nenhum apartamento vinculado à sua conta." />
        ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
                  <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[hsl(0,0%,93%)]">
                      <KeyRound className="h-5 w-5 text-[hsl(4,84%,56%)]" />
                      Meu PIN de retirada (4 dígitos)
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-sm text-[hsl(0,0%,60%)]">
                      Este PIN é utilizado na portaria para confirmar a retirada das suas encomendas de forma segura. Você pode alterá-lo a qualquer momento.
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={pinValue}
                        onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-32 font-mono text-lg tracking-widest text-center"
                      />
                      <Button
                        onClick={() => void handleSavePin()}
                        disabled={savingPin || pinValue.length !== 4}
                        className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]"
                      >
                        {savingPin ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar PIN'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)]">
                  <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-[hsl(0,0%,93%)]">
                      <Home className="h-5 w-5 text-[hsl(4,84%,56%)]" />
                      Moradores do apartamento
                    </h3>
                  </div>
                  <div className="p-4">
                    <p className="mb-4 text-sm text-[hsl(0,0%,60%)]">
                      Cadastre os demais moradores para que seus nomes sejam reconhecidos quando
                      chegarem encomendas. Eles <span className="font-medium text-[hsl(0,0%,80%)]">não</span> recebem login —
                      apenas você acessa a conta.
                    </p>

                    {members.length === 0 ? (
                      <p className="text-sm text-[hsl(0,0%,50%)]">
                        Nenhum outro morador cadastrado ainda.
                      </p>
                    ) : (
                      <ul className="divide-y divide-[hsl(0,0%,20%)]">
                        {members.map((m) => (
                          <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="font-medium text-[hsl(0,0%,93%)]">{m.full_name}</span>
                            <span className="text-[hsl(0,0%,60%)]">
                              {m.phone ? formatPhone(m.phone) : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)] h-fit">
                <div className="border-b border-[hsl(0,0%,20%)] px-4 py-3">
                  <h3 className="text-sm font-medium text-[hsl(0,0%,93%)]">Adicionar morador</h3>
                </div>
                <div className="grid gap-4 p-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hm-name" className="text-[hsl(0,0%,70%)]">Nome completo</Label>
                    <Input
                      id="hm-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex.: Maria da Silva"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hm-phone" className="text-[hsl(0,0%,70%)]">WhatsApp (opcional)</Label>
                    <Input
                      id="hm-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 90000-0000"
                      inputMode="tel"
                    />
                  </div>
                  <Button
                    onClick={() => void handleAdd()}
                    disabled={saving || !name.trim()}
                    className="bg-[hsl(4,84%,56%)] text-white hover:bg-[hsl(4,84%,50%)]"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Adicionar morador
                  </Button>
                </div>
              </div>
            </div>
        )}
      </div>
    </AppLayout>
  )
}
