import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { listCondominiums, type CondominiumRecord } from '@/features/cadastros/condominium.service'

interface CondominiumContextValue {
  condominium: CondominiumRecord | null
  loading: boolean
  error: string | null
  reload: () => void
}

const CondominiumContext = createContext<CondominiumContextValue | null>(null)

/**
 * Provider compartilhado: busca o condomínio do usuário UMA VEZ e
 * disponibiliza via context para todas as páginas. Elimina 15+ queries
 * duplicadas do `useCurrentCondominium` original.
 */
export function CondominiumProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [condominium, setCondominium] = useState<CondominiumRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isAuthenticated) {
      setCondominium(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    listCondominiums()
      .then((condos) => {
        if (!active) return
        setCondominium(condos[0] ?? null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar condomínio')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const value = useMemo<CondominiumContextValue>(
    () => ({ condominium, loading, error, reload }),
    [condominium, loading, error, reload],
  )

  return React.createElement(CondominiumContext.Provider, { value }, children)
}

/**
 * Hook que consome o context. Mantém a mesma interface do hook original
 * para compatibilidade com todas as páginas existentes.
 */
export function useCurrentCondominium(): CondominiumContextValue {
  const ctx = useContext(CondominiumContext)
  if (!ctx) {
    throw new Error('useCurrentCondominium deve ser usado dentro de <CondominiumProvider>')
  }
  return ctx
}
