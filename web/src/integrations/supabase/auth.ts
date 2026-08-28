import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/auth'
import { isRole } from '@/types/roles'

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  return supabase.auth.getSession()
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return null
  if (!isRole(data.role)) {
    console.warn(`[auth] Unknown role "${data.role}" for user ${userId}`)
    return null
  }
  return { ...data, role: data.role }
}