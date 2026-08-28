import { Role, OPERATIONAL_ROLES } from '@/types/roles'

export { ADMIN_ROLES } from '@/types/roles'

/**
 * Página inicial de cada papel (redirect default após login).
 */
export const ROLE_DEFAULT_PATH: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/dashboard',
  [Role.SYNDIC]: '/dashboard',
  [Role.DOORMAN]: '/recebimento/dashboard',
  [Role.RECEPTIONIST]: '/recebimento/dashboard',
  [Role.RESIDENT]: '/minhas-encomendas',
}

/** /dashboard → SUPER_ADMIN + SYNDIC */
export const DASHBOARD_ROLES = new Set<Role>([Role.SUPER_ADMIN, Role.SYNDIC])

/** /recebimento → papéis operacionais (inclui admins) */
export const RECEIVING_ROLES = OPERATIONAL_ROLES

/** /minhas-encomendas → moradores */
export const RESIDENT_ROLES = new Set<Role>([Role.RESIDENT])

/** Qualquer usuário autenticado (central de notificações). */
export const AUTHENTICATED_ROLES = new Set<Role>(Object.values(Role))

export function canAccess(
  role: Role | null | undefined,
  allowed: ReadonlySet<Role> | Role[],
): boolean {
  const set = allowed instanceof Set ? allowed : new Set(allowed)
  return !!role && set.has(role)
}

export function defaultPathFor(role: Role | null | undefined): string {
  return role ? ROLE_DEFAULT_PATH[role] : '/login'
}