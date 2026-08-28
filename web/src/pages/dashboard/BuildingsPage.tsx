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
  createBuilding,
  deleteBuilding,
  generateCondoStructure,
  listBuildings,
  updateBuilding,
  type BuildingListItem,
} from '@/features/cadastros/building.service'
import {
  buildingFormSchema,
  emptyBuildingForm,
} from '@/validations/building.schema'

const columns: CrudColumn<BuildingListItem>[] = [
  {
    key: 'name',
    header: 'Bloco',
    cell: (b) => <span className="font-medium">{b.name}</span>,
  },
  {
    key: 'identifier',
    header: 'Identificador',
    cell: (b) => b.identifier ?? '—',
  },
  {
    key: 'units_count',
    header: 'Unidades',
    cell: (b) => b.units_count,
    className: 'w-24',
  },
  {
    key: 'active',
    header: 'Status',
    cell: (b) => <StatusBadge active={b.active} />,
    className: 'w-24',
  },
]

export default function BuildingsPage() {
  const { condominium, loading: condoLoading } = useCurrentCondominium()
  const [buildings, setBuildings] = useState<BuildingListItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const form = useFormState(buildingFormSchema, emptyBuildingForm)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BuildingListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [towersCount, setTowersCount] = useState(1)
  const [floorsCount, setFloorsCount] = useState(4)
  const [unitsPerFloor, setUnitsPerFloor] = useState(4)
  const [towerPrefix, setTowerPrefix] = useState('Bloco')
  const [numberingType, setNumberingType] = useState<'FLOOR_SUFFIX' | 'SEQUENTIAL'>('FLOOR_SUFFIX')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!condominium) {
      setDataLoading(false)
      return
    }
    let active = true
    setDataLoading(true)
    setDataError(null)
    listBuildings(condominium.id)
      .then((rows) => {
        if (active) setBuildings(rows)
      })
      .catch((err: unknown) => {
        if (active) setDataError(err instanceof Error ? err.message : 'Erro ao carregar blocos')
      })
      .finally(() => {
        if (active) setDataLoading(false)
      })
    return () => {
      active = false
    }
  }, [condominium])

  function openCreate() {
    form.reset(emptyBuildingForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(building: BuildingListItem) {
    form.reset({ name: building.name, identifier: building.identifier ?? '' })
    setEditingId(building.id)
    setDialogOpen(true)
  }

  async function submit() {
    const data = form.parse()
    if (!data || !condominium) return
    setSaving(true)
    const result = editingId
      ? await updateBuilding(editingId, data)
      : await createBuilding(condominium.id, data)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(editingId ? 'Bloco atualizado' : 'Bloco criado')
    setDialogOpen(false)
    const rows = await listBuildings(condominium.id)
    setBuildings(rows)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteBuilding(deleteTarget.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Bloco excluído')
    setDeleteTarget(null)
    if (condominium) {
      const rows = await listBuildings(condominium.id)
      setBuildings(rows)
    }
  }

  async function handleGenerateStructure() {
    if (!condominium) return
    setGenerating(true)
    const result = await generateCondoStructure(condominium.id, {
      towersCount: Number(towersCount) || 1,
      floorsCount: Number(floorsCount) || 1,
      unitsPerFloor: Number(unitsPerFloor) || 1,
      towerPrefix: towerPrefix.trim() || 'Bloco',
      numberingType,
    })
    setGenerating(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Torres e apartamentos gerados com sucesso!')
    setWizardOpen(false)
    const rows = await listBuildings(condominium.id)
    setBuildings(rows)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Blocos / Torres"
          description="Cadastro de blocos e torres do condomínio"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setWizardOpen(true)} disabled={!condominium || condoLoading}>
                Gerador Automático
              </Button>
              <Button onClick={openCreate} disabled={!condominium || condoLoading}>
                <Plus className="h-4 w-4" />
                Novo bloco
              </Button>
            </div>
          }
        />

        <CrudTable
          columns={columns}
          rows={buildings}
          rowKey={(b) => b.id}
          loading={dataLoading || condoLoading}
          error={dataError}
          emptyMessage="Nenhum bloco cadastrado"
          searchBy={(b) => `${b.name} ${b.identifier ?? ''}`}
          searchPlaceholder="Buscar bloco..."
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar bloco' : 'Novo bloco'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Atualize as informações do bloco.'
                : 'Adicione um novo bloco ou torre ao condomínio.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <FormField label="Nome" htmlFor="blk-name" error={form.fieldError('name')}>
              <Input
                id="blk-name"
                value={form.values.name}
                onChange={(e) => form.setField('name', e.target.value)}
                placeholder="Ex.: Bloco A"
              />
            </FormField>
            <FormField
              label="Identificador"
              htmlFor="blk-identifier"
              error={form.fieldError('identifier')}
            >
              <Input
                id="blk-identifier"
                value={form.values.identifier}
                onChange={(e) => form.setField('identifier', e.target.value)}
                placeholder="Ex.: A"
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

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Excluir bloco"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir permanentemente o bloco "${deleteTarget.name}" e todas as suas unidades vinculadas?`
            : ''
        }
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
      />

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerador Automático de Torres e Apartamentos</DialogTitle>
            <DialogDescription>
              Informe a estrutura do condomínio para criar blocos e unidades automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <FormField label="Quantidade de Torres / Blocos">
              <Input
                type="number"
                min={1}
                value={towersCount}
                onChange={(e) => setTowersCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </FormField>

            <FormField label="Prefixo do Bloco / Torre">
              <Input
                value={towerPrefix}
                onChange={(e) => setTowerPrefix(e.target.value)}
                placeholder="Ex.: Bloco, Torre, Edifício"
              />
            </FormField>

            <FormField label="Quantidade de Andares">
              <Input
                type="number"
                min={1}
                value={floorsCount}
                onChange={(e) => setFloorsCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </FormField>

            <FormField label="Apartamentos por Andar">
              <Input
                type="number"
                min={1}
                value={unitsPerFloor}
                onChange={(e) => setUnitsPerFloor(Math.max(1, Number(e.target.value) || 1))}
              />
            </FormField>

            <FormField label="Caracterização / Numeração">
              <select
                value={numberingType}
                onChange={(e) => setNumberingType(e.target.value as 'FLOOR_SUFFIX' | 'SEQUENTIAL')}
                className="flex h-10 w-full rounded-md border border-[hsl(0,0%,25%)] bg-[hsl(0,0%,13%)] px-3 py-2 text-sm text-[hsl(0,0%,93%)] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="FLOOR_SUFFIX">Padrão Andar + Unidade (Ex: 101, 102, 201...)</option>
                <option value="SEQUENTIAL">Sequencial por Bloco (Ex: 1, 2, 3, 4...)</option>
              </select>
            </FormField>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWizardOpen(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button onClick={() => void handleGenerateStructure()} disabled={generating}>
              {generating ? 'Gerando...' : 'Gerar Estrutura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}