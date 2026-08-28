import { useMemo, useRef, useState } from 'react'
import { Search, UserRoundX, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { maskCPF } from '@/lib/utils'
import type { ResidentOption } from '@/features/packages/package.service'

interface ResidentSelectorProps {
  options: ResidentOption[]
  value: ResidentOption | null
  onChange: (resident: ResidentOption | null) => void
  disabled?: boolean
}

/**
 * Autocomplete de morador para a portaria: busca por nome, unidade,
 * CPF (mascarado) e e-mail. Permite limpar (encomenda não identificada).
 */
export function ResidentSelector({
  options,
  value,
  onChange,
  disabled,
}: ResidentSelectorProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) =>
      [o.full_name, o.email, o.unit_label, maskCPF(o.cpf)].join(' ').toLowerCase().includes(q),
    )
  }, [options, query])

  function select(o: ResidentOption) {
    onChange(o)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-medium">{value.full_name}</span>
          {value.is_household && (
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
              co-morador
            </span>
          )}
          <span className="text-muted-foreground">{value.unit_label}</span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={disabled}>
          <UserRoundX className="h-4 w-4" />
          Remover
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar morador por nome, unidade, CPF..."
          className="pl-8"
          disabled={disabled}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.map((o) => (
            <li key={o.resident_id}>
              <button
                type="button"
                onMouseDown={() => select(o)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="truncate">{o.full_name}</span>
                    {o.is_household && (
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        co-morador
                      </span>
                    )}
                  </span>
                  {!o.is_household && (
                    <span className="block truncate text-xs text-muted-foreground">{o.email}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {o.unit_label}
                  {o.cpf ? ` · ${maskCPF(o.cpf)}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && query.trim() && (
        <p className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
          Nenhum morador encontrado.
        </p>
      )}
    </div>
  )
}