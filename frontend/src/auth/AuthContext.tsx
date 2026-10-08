import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/api'
import type { AuthResponse, UserProfile } from '../lib/types'

interface AuthState {
  user: UserProfile | null
  /** False until we know whether the stored token (if any) is still valid. */
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: UserProfile) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUserState] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(() => getToken() === null)

  useEffect(() => {
    if (getToken() === null) return
    let cancelled = false
    api
      .get<UserProfile>('/api/me')
      .then((me) => !cancelled && setUserState(me))
      .catch(() => setToken(null))
      .finally(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUserState(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout)
  }, [logout])

  const accept = useCallback(
    (auth: AuthResponse) => {
      queryClient.clear()
      setToken(auth.token)
      setUserState(auth.user)
    },
    [queryClient],
  )

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      login: async (email, password) => accept(await api.post<AuthResponse>('/api/auth/login', { email, password })),
      register: async (name, email, password) =>
        accept(await api.post<AuthResponse>('/api/auth/register', { name, email, password })),
      logout,
      setUser: setUserState,
    }),
    [user, ready, accept, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** For pages rendered only to signed-in users. */
// eslint-disable-next-line react-refresh/only-export-components
export function useMe(): UserProfile {
  const { user } = useAuth()
  if (!user) throw new Error('useMe requires a signed-in user')
  return user
}
