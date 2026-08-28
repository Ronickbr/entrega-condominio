import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentCondominium } from '@/hooks/useCurrentCondominium'
import { Role } from '@/types/roles'
import {
  globalSearch,
  type GlobalSearchResult,
} from '@/features/dashboard/dashboard.service'

const CATEGORY_LABELS: Record<string, string> = {
  unit: 'Unidade',
  resident: 'Morador',
  package: 'Encomenda',
  authorization: 'Autorização',
}

/** Busca global no header (debounce 200ms → RPC global_search). */
export function GlobalSearchBar() {
  const { condominium } = useCurrentCondominium()
  const { role } = useAuth()
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!term.trim() || !condominium) {
      setResults([])
      setOpen(false)
      return
    }
    const timer = setTimeout(() => {
      setLoading(true)
      globalSearch(condominium.id, term)
        .then((rows) => {
          setResults(rows)
          setOpen(true)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(timer)
  }, [term, condominium])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function hrefFor(r: GlobalSearchResult): string {
    if (r.category === 'package') return `/recebimento/${r.id}`
    if (r.category === 'authorization') return '/recebimento/terceiros'
    if (r.category === 'unit') {
      return role === Role.SUPER_ADMIN || role === Role.SYNDIC
        ? '/dashboard/unidades'
        : '/recebimento'
    }
    if (r.category === 'resident') {
      return role === Role.SUPER_ADMIN || role === Role.SYNDIC
        ? '/dashboard/moradores'
        : '/recebimento'
    }
    return '/recebimento'
  }

  function select(r: GlobalSearchResult) {
    setOpen(false)
    setTerm('')
    navigate(hrefFor(r))
  }

  const showEmpty = open && !loading && term.trim() && results.length === 0

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          placeholder="Buscar encomenda, morador..."
          className="w-52 pl-8 sm:w-64"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-md border bg-popover py-1 text-popover-foreground shadow-lg">
          {results.map((r) => (
            <button
              key={`${r.category}-${r.id}`}
              type="button"
              onClick={() => select(r)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <Badge variant="secondary" className="shrink-0">
                {CATEGORY_LABELS[r.category] ?? r.category}
              </Badge>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Buscando...
        </div>
      )}

      {showEmpty && (
        <div className="absolute right-0 top-full z-30 mt-1 w-80 rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-lg">
          Nenhum resultado para “{term.trim()}”.
        </div>
      )}
    </div>
  )
}