/**
 * Perfis de acesso do sistema.
 * Sincronizado com o CHECK em public.profiles.role (migration 0001).
 */
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SYNDIC: 'SYNDIC',
  DOORMAN: 'DOORMAN',
  RECEPTIONIST: 'RECEPTIONIST',
  RESIDENT: 'RESIDENT',
} as const

export type Role = (typeof Role)[keyof typeof Role]

/**
 * Papéis operacionais = podem atuar na portaria.
 */
export const OPERATIONAL_ROLES: ReadonlySet<Role> = new Set([
  Role.SUPER_ADMIN,
  Role.SYNDIC,
  Role.DOORMAN,
  Role.RECEPTIONIST,
])

/**
 * Papéis administrativos = acessam /admin.
 */
export const ADMIN_ROLES: ReadonlySet<Role> = new Set([Role.SUPER_ADMIN])

export type RoleLabelMap = Record<Role, string>
export const ROLE_LABELS: RoleLabelMap = {
  [Role.SUPER_ADMIN]: 'Super Administrador',
  [Role.SYNDIC]: 'Síndico',
  [Role.DOORMAN]: 'Porteiro',
  [Role.RECEPTIONIST]: 'Recepcionista',
  [Role.RESIDENT]: 'Morador',
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && Object.values(Role).includes(value as Role)
}