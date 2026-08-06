import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../../api'
import type { Profile } from '../../lib/types'

interface AuthState {
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ profile: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ profile: null, loading: true })

  useEffect(() => {
    let mounted = true
    void api.getProfile().then((profile) => {
      if (mounted) setState({ profile, loading: false })
    })
    const unsubscribe = api.onAuthChange((profile) => {
      if (mounted) setState({ profile, loading: false })
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
