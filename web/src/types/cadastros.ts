/**
 * Entidades de cadastro da Etapa 3.
 * Sincronizado com os CHECKs das migrations 0003/0004.
 */

/** Cargos de funcionários (public.staff.position) */
export const StaffPosition = {
  SYNDIC: 'SYNDIC',
  DOORMAN: 'DOORMAN',
  RECEPTIONIST: 'RECEPTIONIST',
  MANAGER: 'MANAGER',
} as const

export type StaffPosition = (typeof StaffPosition)[keyof typeof StaffPosition]

export const STAFF_POSITION_LABELS: Record<StaffPosition, string> = {
  [StaffPosition.SYNDIC]: 'Síndico',
  [StaffPosition.DOORMAN]: 'Porteiro',
  [StaffPosition.RECEPTIONIST]: 'Recepcionista',
  [StaffPosition.MANAGER]: 'Gestor',
}

export function isStaffPosition(value: unknown): value is StaffPosition {
  return (
    typeof value === 'string' &&
    Object.values(StaffPosition).includes(value as StaffPosition)
  )
}

/** Endereço do condomínio (public.condominiums.address) */
export interface CondominiumAddress {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipcode?: string
}