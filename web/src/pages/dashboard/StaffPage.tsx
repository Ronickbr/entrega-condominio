import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
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
import { formatPhone } from '@/lib/utils'
import { StaffPosition, STAFF_POSITION_LABELS } from '@/types/cadastros'
import {
  createStaff,
  deactivateStaff,
  listStaff,
  listStaffProfileCandidates,
  updateStaff,
  type StaffListItem,
  type StaffProfileCandidate,
} from '@/features/cadastros/staff.service'
import { emptyStaffForm, staffFormSchema } from '@/validations/staff.schema'

const columns: CrudColumn<StaffListItem>[] = [
  {
    key: 'full_name',
    header: 'Funcionário',
    cell: (s) => (
      <div>
        <p className="font-medium">{s.full_name}</p>
        <p className="text-xs text-muted-foreground">{s.email}</p>
      </div>
    ),
  },
  {
    key: 'position',
    header: 'Cargo',
    cell: (s) => <Badge variant="secondary">{STAFF_POSITION_LABELS[s.position]}</Badge>,
  },
  {
    key: 'phone',
    header: 'Contato',
    cell: (s) => (s.phone ? formatPhone(s.phone) : '—'),
  },
  {
    key: 'active',
    header: 'Status',
    cell: (s) => <StatusBadge active={s.active} />,
    className: 'w-24',
  },
]

export default function StaffPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [staff, setStaff] = useState<StaffListItem[]>([])
  const [candidates, setCandidates] = useState<StaffProfileCandidate[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const form = useFormState(staffFormSchema, emptyStaffForm)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StaffListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!condominium) {
      setDataLoading(false)
      return
    }
    let active = true
    setDataLoading(true)
    setDataError(null)
    Promise.all([listStaff(condominium.id), listStaffProfileCandidates()])
      .then(([rows, profs]) => {
        if (!active) return
        setStaff(rows)
        setCandidates(profs)
      })
      .catch((err: unknown) => {
        if (active) setDataError(err instanceof Error ? err.message : 'Erro ao carregar funcionários')
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  const availableProfiles = useMemo(() => {
    const taken = new Set(staff.map((s) => s.profile_id))
    return candidates.filter((p) => !taken.has(p.id))
  }, [candidates, staff])

  function openCreate() {
    form.reset(emptyStaffForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(row: StaffListItem) {
    form.reset({ profile_id: row.profile_id, position: row.position })
    setEditingId(row.id)
    setDialogOpen(true)
  }

  async function submit() {
    const data = form.parse()
    if (!data || !condominium) return
    setSaving(true)
    const result = editingId
      ? await updateStaff(editingId, data)
      : await createStaff(condominium.id, data)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(editingId ? 'Funcionário atualizado' : 'Funcionário vinculado')
    setDialogOpen(false)
    const [rows, profs] = await Promise.all([
      listStaff(condominium.id),
      listStaffProfileCandidates(),
    ])
    setStaff(rows)
    setCandidates(profs)
  }

  async function confirmDelete() {
    if (!deleteTarget || !condominium) return
    setDeleting(true)
    const result = await deactivateStaff(deleteTarget.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Funcionário inativado')
    setDeleteTarget(null)
    const [rows, profs] = await Promise.all([
      listStaff(condominium.id),
      listStaffProfileCandidates(),
    ])
    setStaff(rows)
    setCandidates(profs)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Funcionários"
          description="Equipe de trabalho do condomínio"
          action={
            <Button onClick={openCreate} disabled={!condominium || condoLoading}>
              <Plus className="h-4 w-4" />
              Vincular funcionário
            </Button>
          }
        />

        <CrudTable
          columns={columns}
          rows={staff}
          rowKey={(s) => s.id}
          loading={dataLoading || condoLoading}
          error={dataError}
          emptyMessage="Nenhum funcionário vinculado"
          searchBy={(s) => `${s.full_name} ${s.email} ${STAFF_POSITION_LABELS[s.position]}`}
          searchPlaceholder="Buscar funcionário..."
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar funcionário' : 'Vincular funcionário'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize o cargo do funcionário.'
                : 'Vincule um perfil administrativo à equipe do condomínio.'}
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
            <FormField label="Cargo" error={form.fieldError('position')}>
              <Select
                value={form.values.position}
                onChange={(e) =>
                  form.setField('position', e.target.value as StaffPosition)
                }
              >
                <option value={StaffPosition.SYNDIC}>
                  {STAFF_POSITION_LABELS[StaffPosition.SYNDIC]}
                </option>
                <option value={StaffPosition.DOORMAN}>
                  {STAFF_POSITION_LABELS[StaffPosition.DOORMAN]}
                </option>
                <option value={StaffPosition.RECEPTIONIST}>
                  {STAFF_POSITION_LABELS[StaffPosition.RECEPTIONIST]}
                </option>
                <option value={StaffPosition.MANAGER}>
                  {STAFF_POSITION_LABELS[StaffPosition.MANAGER]}
                </option>
              </Select>
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

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Inativar funcionário"
        description={
          deleteTarget
            ? `${deleteTarget.full_name} deixará de constar na equipe do condomínio.`
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