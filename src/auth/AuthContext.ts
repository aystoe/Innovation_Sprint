import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
export interface AuthState {
  session: Session | null
  status: 'loading' | 'ready' | 'error'
  error: string
  notice: string
  retry: () => Promise<void>
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required')
  return context
}
