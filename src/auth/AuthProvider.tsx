import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isAllowedEmail } from './domain'
import { isTerminalAuthError } from './sessionErrors'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const current = useRef<Session | null>(null)
  const mounted = useRef(false)
  const version = useRef(0)
  const verifying = useRef(false)
  const signingOut = useRef(false)

  const retry = useCallback(async () => {
    if (!supabase || verifying.current) return
    verifying.current = true
    const revision = version.current
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (revision !== version.current || !mounted.current) return
      let restored = data.session
      if (restored) {
        if ((restored.expires_at ?? 0) * 1000 <= Date.now() + 5000) {
          const refreshed = await supabase.auth.refreshSession()
          if (refreshed.error) throw refreshed.error
          restored = refreshed.data.session
        }
        // Validates a restored/cached session against Auth, rather than trusting localStorage.
        const checked = await supabase.auth.getUser()
        if (checked.error) throw checked.error
        if (!checked.data.user || !isAllowedEmail(checked.data.user.email ?? '')) {
          await supabase.auth.signOut({ scope: 'local' })
          throw new Error('This account is not eligible. Use a TUM email account.')
        }
      }
      // Auth events may have supplied a newer session while verification was in flight.
      if (!mounted.current || revision !== version.current) return
      current.current = restored
      setSession(restored); setStatus('ready'); setError('')
    } catch (cause) {
      if (!mounted.current || revision !== version.current) return
      if (isTerminalAuthError(cause)) {
        const result = await supabase.auth.signOut({ scope: 'local' })
        if (!mounted.current) return
        if (!result.error) {
          current.current = null; setSession(null); setStatus('ready'); setError('')
          setNotice('Your session has expired. Please sign in again.')
          return
        }
      }
      // Network failures must not delete the refresh token. Gate the app and allow retry.
      setStatus('error')
      setError(cause instanceof Error ? cause.message : 'Unable to verify your session. Please retry.')
    } finally { verifying.current = false }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (!supabase) return () => { mounted.current = false }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      // Synchronous callback: no nested Auth calls or profile fetch under the Auth lock.
      version.current += 1
      if (event === 'SIGNED_OUT') {
        if (current.current && !signingOut.current) setNotice('Your session has ended. Please sign in again.')
        current.current = null; setSession(null); setStatus('ready'); setError('')
        return
      }
      if (next && !isAllowedEmail(next.user.email ?? '')) {
        current.current = null; setSession(null); setStatus('error'); setError('Use a TUM email account.')
        return
      }
      current.current = next; setSession(next)
      if (event === 'INITIAL_SESSION') {
        // Verify restored credentials outside this synchronous callback.
        setStatus('loading')
        setTimeout(() => { if (mounted.current) void retry() }, 0)
      } else {
        setStatus(next && (next.expires_at ?? 0) * 1000 <= Date.now() ? 'loading' : 'ready')
        setError(''); setNotice('')
      }
    })
    const check = () => {
      if (!mounted.current || document.visibilityState === 'hidden') return
      if (current.current && (current.current.expires_at ?? 0) * 1000 <= Date.now()) setStatus('loading')
      void retry()
    }
    // Covers background-tab expiry, revoked refresh tokens, and transient offline recovery.
    const timer = setInterval(check, 30000)
    window.addEventListener('online', check)
    window.addEventListener('focus', check)
    return () => {
      mounted.current = false; version.current += 1
      subscription.unsubscribe(); clearInterval(timer)
      window.removeEventListener('online', check); window.removeEventListener('focus', check)
    }
  }, [retry])

  useEffect(() => {
    if (!session?.expires_at) return
    const expiresAt = session.expires_at * 1000
    const timer = setTimeout(() => {
      if (current.current && (current.current.expires_at ?? 0) * 1000 <= Date.now()) {
        setStatus('loading')
        void retry()
      }
    }, Math.max(0, Math.min(expiresAt - Date.now() + 10, 2147483647)))
    return () => clearTimeout(timer)
  }, [session?.expires_at, retry])

  async function signOut() {
    if (!supabase) return
    signingOut.current = true
    try {
      const { error: logoutError } = await supabase.auth.signOut({ scope: 'local' })
      if (logoutError) throw logoutError
      version.current += 1; current.current = null
      setSession(null); setStatus('ready'); setNotice('Signed out.'); setError('')
    } finally { signingOut.current = false }
  }
  return <AuthContext.Provider value={{ session, status, error, notice, retry, signOut }}>{children}</AuthContext.Provider>
}
