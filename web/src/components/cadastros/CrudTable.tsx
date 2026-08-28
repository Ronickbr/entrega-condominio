import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface CrudColumn<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

interface CrudTableProps<T> {
  columns: CrudColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  searchBy?: (row: T) => string
  searchPlaceholder?: string
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  actions?: (row: T) => ReactNode
}

/** Tabela de CRUD com busca client-side, estados vazio/erro e ações. */
export function CrudTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  emptyMessage,
  searchBy,
  searchPlaceholder = 'Buscar...',
  onEdit,
  onDelete,
  actions,
}: CrudTableProps<T>) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!searchBy || !search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((r) => searchBy(r).toLowerCase().includes(q))
  }, [rows, search, searchBy])

  const hasActions = !!onEdit || !!onDelete || !!actions
  const colSpan = columns.length + (hasActions ? 1 : 0)

  return (
    <div className="space-y-3">
      {searchBy && (
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(0,0%,50%)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 border-[hsl(0,0%,25%)] bg-[hsl(0,0%,13%)] text-[hsl(0,0%,93%)] placeholder:text-[hsl(0,0%,40%)]"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[hsl(0,0%,20%)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[hsl(0,0%,20%)] bg-[hsl(0,0%,11%)]">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
              {hasActions && <TableHead className="w-32 text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-24 text-center text-[hsl(0,0%,50%)]">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-24 text-center text-[hsl(4,84%,56%)]">
                  {error}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-24 text-center text-[hsl(0,0%,50%)]">
                  {emptyMessage ?? 'Nenhum registro encontrado'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={rowKey(row)} className="border-b border-[hsl(0,0%,18%)] hover:bg-[hsl(0,0%,15%)]">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {hasActions && (
                    <TableCell className="w-24 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actions && actions(row)}
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(row)}
                            title="Editar"
                            className="h-8 w-8 text-[hsl(0,0%,80%)] hover:text-[hsl(0,0%,93%)] hover:bg-[hsl(0,0%,18%)]"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            className="h-8 w-8 text-[hsl(4,84%,56%)] hover:text-[hsl(4,84%,50%)] hover:bg-[hsl(4,84%,56%)]/10"
                            onClick={() => onDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
