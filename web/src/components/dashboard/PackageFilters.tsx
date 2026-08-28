import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { listUnits, type UnitListItem } from '@/features/cadastros/unit.service'
import { listResidents, type ResidentListItem } from '@/features/cadastros/resident.service'
import { PACKAGE_STATUS_LABELS, PackageStatus } from '@/features/packages/package.types'
import type { ReportFilters } from '@/features/dashboard/dashboard.service'

interface PackageFiltersProps {
  condominiumId: string
  filters: ReportFilters
  onChange: (f: ReportFilters) => void
  onClear: () => void
}

/** Filtros do relatório do síndico (Etapa 9). */
export function PackageFilters({
  condominiumId,
  filters,
  onChange,
  onClear,
}: PackageFiltersProps) {
  const [units, setUnits] = useState<UnitListItem[]>([])
  const [residents, setResidents] = useState<ResidentListItem[]>([])

  useEffect(() => {
    let active = true
    listUnits(condominiumId)
      .then((u) => {
        if (active) setUnits(u.filter((x) => x.active))
      })
      .catch(() => undefined)
    listResidents()
      .then((r) => {
        if (active) setResidents(r.filter((x) => x.active))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [condominiumId])

  const hasFilter = Object.values(filters).some(Boolean)

  return (
    <div className="grid gap-4 rounded-xl border border-[hsl(0,0%,20%)] bg-[hsl(0,0%,13%)] p-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <Label htmlFor="f-start">Data início</Label>
        <Input
          id="f-start"
          type="date"
          value={filters.start ?? ''}
          onChange={(e) => onChange({ ...filters, start: e.target.value || undefined })}
        />
      </div>
      <div>
        <Label htmlFor="f-end">Data fim</Label>
        <Input
          id="f-end"
          type="date"
          value={filters.end ?? ''}
          onChange={(e) => onChange({ ...filters, end: e.target.value || undefined })}
        />
      </div>
      <div>
        <Label htmlFor="f-unit">Unidade</Label>
        <Select
          id="f-unit"
          value={filters.unitId ?? ''}
          onChange={(e) => onChange({ ...filters, unitId: e.target.value || undefined })}
        >
          <option value="">Todas</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.building_name ? `${u.building_name} ${u.number}` : u.number}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-resident">Morador</Label>
        <Select
          id="f-resident"
          value={filters.residentId ?? ''}
          onChange={(e) => onChange({ ...filters, residentId: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          {residents.map((r) => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="f-carrier">Transportadora</Label>
        <Input
          id="f-carrier"
          value={filters.carrier ?? ''}
          placeholder="Ex.: Correios"
          onChange={(e) => onChange({ ...filters, carrier: e.target.value || undefined })}
        />
      </div>
      <div>
        <Label htmlFor="f-status">Status</Label>
        <Select
          id="f-status"
          value={filters.status ?? ''}
          onChange={(e) =>
            onChange({ ...filters, status: e.target.value ? (e.target.value as PackageStatus) : undefined })
          }
        >
          <option value="">Todos</option>
          {Object.values(PackageStatus).map((s) => (
            <option key={s} value={s}>
              {PACKAGE_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {hasFilter && (
        <div className="flex items-end">
          <Button variant="ghost" size="sm" onClick={onClear} className="text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,18%)]">
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
