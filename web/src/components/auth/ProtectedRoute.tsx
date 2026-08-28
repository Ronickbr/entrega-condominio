import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '@/types/roles'
import { useAuth } from '@/hooks/useAuth'
import { canAccess } from '@/lib/rbac'
import { PageLoader } from '@/components/auth/PageLoader'

interface ProtectedRouteProps {
  roles: ReadonlySet<Role> | Role[]
  children: ReactNode
}

/**
 * Guarda de rota privada:
 * 1. Aguarda sessão/profile carregarem.
 * 2. Não autenticado → /login (preservando a rota de origem em `state.from`).
 * 3. Papel sem permissão → /unauthorized.
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { isReady, isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return <PageLoader label="Verificando sessão..." />
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!canAccess(role, roles)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}