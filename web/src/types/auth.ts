import type { Database } from '@/types/supabase'
import type { Role } from '@/types/roles'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type CondoMembershipRow = Database['public']['Tables']['condo_memberships']['Row']
export type CondominiumRow = Database['public']['Tables']['condominiums']['Row']
export type UnitRow = Database['public']['Tables']['units']['Row']

/** Profile normalizado: role tipada como Role (o banco guarda text + CHECK). */
export type UserProfile = Omit<ProfileRow, 'role'> & { role: Role }

export interface AuthSessionInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number
}