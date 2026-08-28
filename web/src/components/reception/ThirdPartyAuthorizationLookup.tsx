import { useMemo, useState } from 'react'
import { Loader2, Search, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  effectiveStatus,
  listOperationalAuthorizations,
  type AuthorizationRecord,
} from '@/features/authorizations/authorizations.service'
import { formatDateTime } from '@/lib/utils'

interface ThirdPartyAuthorizationLookupProps {
  onSelect: (auth: AuthorizationRecord) => void
}

/**
 * Busca operacional de autorizações por nome/documento (Etapa 8).
 * Lista apenas autorizações logicamente ativas (dentro da validade).
 */
export function ThirdPartyAuthorizationLookup({ onSelect }: ThirdPartyAuthorizationLookupProps) {
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<AuthorizationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    setLoading(true)
    setError(null)
    try {
      const data = await listOperationalAuthorizations({ search })
      setRows(data)
      setSearched(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro na busca')
    } finally {
      setLoading(false)
    }
  }

  const visible = useMemo(
    () => rows.filter((a) => effectiveStatus(a) === 'ACTIVE'),
    [rows],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSearch()
          }}
          placeholder="Nome ou documento do autorizado..."
        />
        <Button onClick={() => void handleSearch()} disabled={loading || !search.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {searched && !loading && visible.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma autorização ativa encontrada.
        </p>
      )}

      <div className="grid gap-2">
        {visible.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-medium">
                <UserCheck className="h-4 w-4 text-primary" />
                {a.authorized_name}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {a.authorized_document ?? '—'}
                {' · '}
                {a.package?.internal_code ?? 'Todas as encomendas pendentes'}
                {' · válida até '}
                {formatDateTime(a.valid_until)}
              </p>
            </div>
            <Button size="sm" onClick={() => onSelect(a)}>
              Selecionar
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}