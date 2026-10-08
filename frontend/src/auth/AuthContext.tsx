import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, ApiError, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/api'
import type { AuthResponse, UserProfile } from '../lib/types'

interface AuthState {
  user: UserProfile | null
  /** False until we know whether the stored token (if any) is still valid. */
  ready: boolean
  /** The server could not be reached while restoring the session. The session itself is kept. */
  offline: boolean
  retry: () => void
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
  const [offline, setOffline] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Restore the saved session. Only a 401 from the server means the session is really gone: a sleeping free-tier
  // API, a bad connection or a 5xx must never sign people out, so those are retried (a cold start takes up to ~1 min).
  useEffect(() => {
    if (getToken() === null) return
    let cancelled = false
    const waits = [1500, 3000, 6000, 10000, 15000, 20000]

    async function restore() {
      for (let attempt = 0; ; attempt++) {
        try {
          const me = await api.get<UserProfile>('/api/me')
          if (cancelled) return
          setUserState(me)
          setOffline(false)
          setReady(true)
          return
        } catch (error) {
          if (cancelled) return
          if (error instanceof ApiError && error.status === 401) {
            setToken(null)
            setReady(true)
            return
          }
          if (attempt >= waits.length) {
            setOffline(true)
            setReady(true)
            return
          }
          await new Promise((resolve) => window.setTimeout(resolve, waits[attempt]))
        }
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [retryKey])

  const retry = useCallback(() => {
    setOffline(false)
    setReady(false)
    setRetryKey((k) => k + 1)
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
      offline,
      retry,
      login: async (email, password) => accept(await api.post<AuthResponse>('/api/auth/login', { email, password })),
      register: async (name, email, password) =>
        accept(await api.post<AuthResponse>('/api/auth/register', { name, email, password })),
      logout,
      setUser: setUserState,
    }),
    [user, ready, offline, retry, accept, logout],
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
