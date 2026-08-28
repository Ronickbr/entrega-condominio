import type { APIRequestContext } from '@playwright/test'

export interface SeedUser {
  role: string
  email: string
  password: string
  storageState: string
}

export const SUPABASE_URL = 'http://127.0.0.1:54321'
export const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

export const CONDO_ID = '11111111-1111-1111-1111-111111111111'

export const RESIDENT_IDS = {
  ana: '66666666-6666-6666-6666-666666666601',
  bruno: '66666666-6666-6666-6666-666666666602',
  carla: '66666666-6666-6666-6666-666666666603',
}

export const USERS: SeedUser[] = [
  { role: 'super_admin', email: 'admin@condominio.dev', password: 'admin', storageState: '.auth/super_admin.json' },
  { role: 'syndic', email: 'sindico@condominio.dev', password: 'sindico', storageState: '.auth/syndic.json' },
  { role: 'doorman', email: 'porteiro@condominio.dev', password: 'porteiro', storageState: '.auth/doorman.json' },
  { role: 'receptionist', email: 'recepcao@condominio.dev', password: 'recepcao', storageState: '.auth/receptionist.json' },
  { role: 'resident', email: 'ana@condominio.dev', password: 'morador1', storageState: '.auth/resident.json' },
]

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  const body = await res.json()
  return body.access_token as string
}

export function restHeaders(token: string): Record<string, string> {
  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}