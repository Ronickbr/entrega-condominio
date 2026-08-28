import { execSync } from 'node:child_process'
import { SUPABASE_URL } from './users'

/**
 * Reseta o banco local (migrations + seed) antes de uma suíte.
 * Requer Docker + Supabase CLI. Use `SKIP_DB_RESET=1` para pular.
 */
export async function resetDb(): Promise<void> {
  if (process.env.SKIP_DB_RESET === '1') return
  try {
    execSync('npx supabase db reset --local', { stdio: 'inherit', shell: 'powershell.exe' })
  } catch (err) {
    console.warn('[e2e] falha ao resetar o banco (continuando):', err)
  }
}

/** Aguarda o Supabase local responder (Kong up). */
export async function waitForSupabase(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`)
      if (res.ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error('Supabase local não respondeu a tempo')
}