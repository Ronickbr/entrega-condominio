import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/cadastros/PageHeader'
import { FormField } from '@/components/cadastros/FormField'
import { useFormState } from '@/components/cadastros/useFormState'
import { CrudTable, type CrudColumn } from '@/components/cadastros/CrudTable'
import { StatusBadge } from '@/components/cadastros/StatusBadge'
import { ConfirmDeleteDialog } from '@/components/cadastros/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import { maskCPF } from '@/lib/utils'
import {
  createResident,
  deleteResident,
  listProfileCandidates,
  listResidents,
  updateResident,
  updateResidentPin,
  type ProfileCandidate,
  type ResidentListItem,
} from '@/features/cadastros/resident.service'
import { listUnits, type UnitListItem } from '@/features/cadastros/unit.service'
import { emptyResidentForm, residentFormSchema } from '@/validations/resident.schema'

const columns: CrudColumn<ResidentListItem>[] = [
  {
    key: 'full_name',
    header: 'Morador',
    cell: (r) => (
      <div>
        <p className="font-medium">{r.full_name}</p>
        <p className="text-xs text-muted-foreground">{r.email}</p>
      </div>
    ),
  },
  {
    key: 'unit',
    header: 'Unidade',
    cell: (r) =>
      r.building_name ? `${r.building_name} ${r.unit_number ?? ''}`.trim() : (r.unit_number ?? '—'),
  },
  {
    key: 'cpf',
    header: 'CPF',
    cell: (r) => maskCPF(r.cpf) || '—',
  },
  {
    key: 'is_primary',
    header: 'Vínculo',
    cell: (r) => (
      <div className="flex items-center gap-2">
        {r.is_primary ? <Badge>Titular</Badge> : <Badge variant="outline">Dependente</Badge>}
        {r.pin_code && <Badge variant="secondary" className="font-mono">PIN: ****</Badge>}
      </div>
    ),
  },
  {
    key: 'active',
    header: 'Status',
    cell: (r) => <StatusBadge active={r.active} />,
    className: 'w-24',
  },
]

export default function ResidentsPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [residents, setResidents] = useState<ResidentListItem[]>([])
  const [candidates, setCandidates] = useState<ProfileCandidate[]>([])
  const [units, setUnits] = useState<UnitListItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const form = useFormState(residentFormSchema, emptyResidentForm)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ResidentListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pinModalResident, setPinModalResident] = useState<ResidentListItem | null>(null)
  const [newPinValue, setNewPinValue] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  useEffect(() => {
    if (!condominium) {
      setDataLoading(false)
      return
    }
    let active = true
    setDataLoading(true)
    setDataError(null)
    Promise.all([listResidents(), listProfileCandidates(), listUnits(condominium.id)])
      .then(([rows, profs, unts]) => {
        if (!active) return
        setResidents(rows)
        setCandidates(profs)
        setUnits(unts)
      })
      .catch((err: unknown) => {
        if (active) setDataError(err instanceof Error ? err.message : 'Erro ao carregar moradores')
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  /** Perfis disponíveis para vínculo (exclui quem já é morador). */
  const availableProfiles = useMemo(() => {
    const taken = new Set(residents.map((r) => r.profile_id))
    return candidates.filter((p) => !taken.has(p.id))
  }, [candidates, residents])

  function openCreate() {
    form.reset(emptyResidentForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(resident: ResidentListItem) {
    form.reset({
      profile_id: resident.profile_id,
      unit_id: resident.unit_id,
      is_primary: resident.is_primary,
      pin_code: resident.pin_code ?? '',
    })
    setEditingId(resident.id)
    setDialogOpen(true)
  }

  function openPinModal(resident: ResidentListItem) {
    setPinModalResident(resident)
    setNewPinValue('')
  }

  async function handleSavePin() {
    if (!pinModalResident) return
    if (!/^\d{4}$/.test(newPinValue)) {
      toast.error('O PIN deve conter exatamente 4 dígitos numéricos')
      return
    }
    setSavingPin(true)
    const result = await updateResidentPin(pinModalResident.id, newPinValue)
    setSavingPin(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('PIN alterado com sucesso!')
    setPinModalResident(null)
    const rows = await listResidents()
    setResidents(rows)
  }

  async function submit() {
    const data = form.parse()
    if (!data) return
    setSaving(true)
    const result = editingId
      ? await updateResident(editingId, data)
      : await createResident(data)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(editingId ? 'Morador atualizado' : 'Morador vinculado')
    setDialogOpen(false)
    const [rows, profs] = await Promise.all([listResidents(), listProfileCandidates()])
    setResidents(rows)
    setCandidates(profs)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteResident(deleteTarget.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Morador excluído')
    setDeleteTarget(null)
    const [rows, profs] = await Promise.all([listResidents(), listProfileCandidates()])
    setResidents(rows)
    setCandidates(profs)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Moradores"
          description="Vínculo de perfis às unidades do condomínio"
          action={
            <Button onClick={openCreate} disabled={!condominium || condoLoading}>
              <Plus className="h-4 w-4" />
              Vincular morador
            </Button>
          }
        />

          <CrudTable
            columns={columns}
            rows={residents}
            rowKey={(r) => r.id}
            loading={dataLoading || condoLoading}
            error={dataError}
            emptyMessage="Nenhum morador vinculado"
            searchBy={(r) =>
              `${r.full_name} ${r.email} ${r.building_name ?? ''} ${r.unit_number ?? ''}`
            }
            searchPlaceholder="Buscar morador..."
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            actions={(r) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openPinModal(r)}
                title="Gerenciar PIN de 4 dígitos"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
            )}
          />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar morador' : 'Vincular morador'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize a unidade e o vínculo do morador.'
                : 'Vincule um perfil a uma unidade do condomínio.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <FormField label="Perfil" error={form.fieldError('profile_id')}>
              <Select
                value={form.values.profile_id}
                onChange={(e) => form.setField('profile_id', e.target.value)}
              >
                <option value="">Selecione o perfil...</option>
                {(editingId ? candidates : availableProfiles).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.email})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Unidade" error={form.fieldError('unit_id')}>
              <Select
                value={form.values.unit_id}
                onChange={(e) => form.setField('unit_id', e.target.value)}
              >
                <option value="">Selecione a unidade...</option>
                {units
                  .filter((u) => u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.building_name ? `${u.building_name} ${u.number}` : u.number}
                    </option>
                  ))}
              </Select>
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.values.is_primary}
                onChange={(e) => form.setField('is_primary', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Titular da unidade
            </label>
            <FormField label="PIN de 4 dígitos (numeral)" error={form.fieldError('pin_code')}>
              <Input
                type="text"
                maxLength={4}
                placeholder="Ex: 1234"
                value={form.values.pin_code ?? ''}
                onChange={(e) => form.setField('pin_code', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pinModalResident} onOpenChange={(open) => !open && setPinModalResident(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar PIN do Morador</DialogTitle>
            <DialogDescription>
              Informe um novo PIN de exatamente 4 dígitos numéricos para {pinModalResident?.full_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <FormField label="Novo PIN (4 dígitos)">
              <Input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={newPinValue}
                onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPinModalResident(null)} disabled={savingPin}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSavePin()} disabled={savingPin || newPinValue.length !== 4}>
              {savingPin ? 'Salvando...' : 'Salvar PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Excluir morador"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir permanentemente o morador ${deleteTarget.full_name}?`
            : ''
        }
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
      />
    </AppLayout>
  )
}