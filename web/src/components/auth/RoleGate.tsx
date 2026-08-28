import type { ReactNode } from 'react'
import type { Role } from '@/types/roles'
import { useAuth } from '@/hooks/useAuth'
import { canAccess } from '@/lib/rbac'

interface RoleGateProps {
  roles: ReadonlySet<Role> | Role[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Renderiza os filhos apenas se o papel do usuário estiver na lista.
 * Caso contrário, renderiza `fallback` (padrão: nada).
 */
export function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const { role } = useAuth()
  if (!canAccess(role, roles)) return fallback
  return children
}