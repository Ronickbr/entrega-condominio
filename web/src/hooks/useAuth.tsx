import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { fetchProfile, signInWithEmail, signOut } from '@/integrations/supabase/auth'
import type { UserProfile } from '@/types/auth'
import type { Role } from '@/types/roles'
import { isRole } from '@/types/roles'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  role: Role | null
  isLoading: boolean
  isProfileLoading: boolean
  isReady: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)

  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setIsProfileLoading(false)
      setProfileChecked(false)
      return
    }
    let active = true
    setIsProfileLoading(true)
    setProfileChecked(false)
    void fetchProfile(session.user.id).then((p) => {
      if (!active) return
      setProfile(p)
      setIsProfileLoading(false)
      setProfileChecked(true)
    })
    return () => {
      active = false
    }
  }, [session])

  const refreshProfile = useCallback(async () => {
    const currentSession = sessionRef.current
    if (!currentSession?.user) {
      setProfile(null)
      return
    }
    setIsProfileLoading(true)
    const p = await fetchProfile(currentSession.user.id)
    setProfile(p)
    setIsProfileLoading(false)
  }, [])

  const signInFn = useCallback(async (email: string, password: string) => {
    const { data, error } = await signInWithEmail(email, password)
    if (error) return { error: error.message }
    const p = await fetchProfile(data.user.id)
    setProfile(p)
    setIsProfileLoading(false)
    setProfileChecked(true)
    return { error: null }
  }, [])

  const signOutFn = useCallback(async () => {
    await signOut()
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const role = profile && isRole(profile.role) ? profile.role : null
    return {
      user: session?.user ?? null,
      profile,
      role,
      isLoading,
      isProfileLoading,
      isReady: !isLoading && (!session?.user || profileChecked),
      isAuthenticated: !!session?.user,
      signIn: signInFn,
      signOut: signOutFn,
      refreshProfile,
    }
  }, [session, profile, isLoading, isProfileLoading, profileChecked, signInFn, signOutFn, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
