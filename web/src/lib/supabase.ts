import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? 'http://127.0.0.1:54321'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? ''

if (!supabaseAnonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_ANON_KEY não configurada em .env.local. Autenticação/queries reais precisarão desta chave.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: { 'X-App-Name': 'condominio-gestao-encomendas' },
  },
  db: {
    schema: 'public',
  },
})

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_ANON_KEY = supabaseAnonKey
