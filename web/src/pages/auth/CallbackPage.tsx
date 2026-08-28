import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { defaultPathFor } from '@/lib/rbac'
import { PageLoader } from '@/components/auth/PageLoader'

/**
 * Rota de callback de auth (fluxo OAuth / code exchange).
 * Com email/senha o client já captura a sessão na URL (detectSessionInUrl),
 * então aqui apenas finalizamos um eventual code e redirecionamos.
 */
export default function CallbackPage() {
  const { isReady, isAuthenticated, role } = useAuth()
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      handled.current = true
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) navigate('/login', { replace: true })
      })
    }
  }, [navigate])

  if (isReady && isAuthenticated) {
    return <Navigate to={defaultPathFor(role)} replace />
  }

  return <PageLoader label="Finalizando autenticação..." />
}