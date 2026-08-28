import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import {
  createUnit,
  deactivateUnit,
  listUnits,
  updateUnit,
  type UnitListItem,
} from '@/features/cadastros/unit.service'
import { listBuildings, type BuildingListItem } from '@/features/cadastros/building.service'
import { emptyUnitForm, unitFormSchema } from '@/validations/unit.schema'

const columns: CrudColumn<UnitListItem>[] = [
  {
    key: 'number',
    header: 'Unidade',
    cell: (u) => <span className="font-medium">{u.number}</span>,
  },
  {
    key: 'floor',
    header: 'Andar',
    cell: (u) => u.floor ?? '—',
    className: 'w-24',
  },
  {
    key: 'building_name',
    header: 'Bloco',
    cell: (u) => u.building_name ?? '—',
  },
  {
    key: 'active',
    header: 'Status',
    cell: (u) => <StatusBadge active={u.active} />,
    className: 'w-24',
  },
]

export default function UnitsPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [units, setUnits] = useState<UnitListItem[]>([])
  const [buildings, setBuildings] = useState<BuildingListItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const form = useFormState(unitFormSchema, emptyUnitForm)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UnitListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!condominium) {
      setDataLoading(false)
      return
    }
    let active = true
    setDataLoading(true)
    setDataError(null)
    Promise.all([listUnits(condominium.id), listBuildings(condominium.id)])
      .then(([rows, blds]) => {
        if (!active) return
        setUnits(rows)
        setBuildings(blds)
      })
      .catch((err: unknown) => {
        if (active) setDataError(err instanceof Error ? err.message : 'Erro ao carregar unidades')
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  function openCreate() {
    form.reset(emptyUnitForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(unit: UnitListItem) {
    form.reset({
      number: unit.number,
      floor: unit.floor ?? '',
      building_id: unit.building_id,
    })
    setEditingId(unit.id)
    setDialogOpen(true)
  }

  async function submit() {
    const data = form.parse()
    if (!data || !condominium) return
    setSaving(true)
    const result = editingId
      ? await updateUnit(editingId, data)
      : await createUnit(condominium.id, data)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(editingId ? 'Unidade atualizada' : 'Unidade criada')
    setDialogOpen(false)
    const rows = await listUnits(condominium.id)
    setUnits(rows)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deactivateUnit(deleteTarget.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Unidade inativada')
    setDeleteTarget(null)
    if (condominium) {
      const rows = await listUnits(condominium.id)
      setUnits(rows)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Unidades"
          description="Cadastro de unidades habitacionais"
          action={
            <Button onClick={openCreate} disabled={!condominium || condoLoading}>
              <Plus className="h-4 w-4" />
              Nova unidade
            </Button>
          }
        />

        <CrudTable
          columns={columns}
          rows={units}
          rowKey={(u) => u.id}
          loading={dataLoading || condoLoading}
          error={dataError}
          emptyMessage="Nenhuma unidade cadastrada"
          searchBy={(u) => `${u.number} ${u.building_name ?? ''}`}
          searchPlaceholder="Buscar unidade..."
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar unidade' : 'Nova unidade'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize as informações da unidade.'
                : 'Adicione uma nova unidade ao condomínio.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <FormField label="Número" htmlFor="unit-number" error={form.fieldError('number')}>
              <Input
                id="unit-number"
                value={form.values.number}
                onChange={(e) => form.setField('number', e.target.value)}
                placeholder="Ex.: 101"
              />
            </FormField>
            <FormField label="Andar" htmlFor="unit-floor" error={form.fieldError('floor')}>
              <Input
                id="unit-floor"
                value={form.values.floor}
                onChange={(e) => form.setField('floor', e.target.value)}
                placeholder="Ex.: 1"
              />
            </FormField>
            <FormField label="Bloco" error={form.fieldError('building_id')}>
              <Select
                value={form.values.building_id ?? ''}
                onChange={(e) => form.setField('building_id', e.target.value || null)}
              >
                <option value="">Sem bloco</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
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
        title="Inativar unidade"
        description={
          deleteTarget
            ? `A unidade ${deleteTarget.number} será desativada e deixará de aparecer nos cadastros.`
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