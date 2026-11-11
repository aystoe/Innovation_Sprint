import { useState } from 'react'
import type { FormEvent, PropsWithChildren } from 'react'
import { supabaseConfigError, requireSupabase } from '../lib/supabase'
import { EMAIL_ERROR, isAllowedEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from './domain'
import { useAuth } from './AuthContext'
import { FormError } from '../components/FormError'

export function AuthGate({ children }: PropsWithChildren) {
  const auth = useAuth()
  if (supabaseConfigError) return <AuthShell><h1>Connect Supabase</h1><p role="alert">{supabaseConfigError}</p></AuthShell>
  if (auth.status === 'loading') return <AuthShell><p role="status">Checking your session…</p></AuthShell>
  if (auth.status === 'error') return <AuthShell><h1>Connection needed</h1><FormError message={auth.error} /><button className="primary" onClick={() => void auth.retry()}>Retry</button><LogoutButton /></AuthShell>
  if (!auth.session) return <LoginForm />
  return children
}
function AuthShell({ children }: PropsWithChildren) {
  return <div className="phone"><header className="brand"><div className="wordmark"><i aria-hidden="true" />Common Ground</div></header><main className="page">{children}</main></div>
}
function LoginForm() {
  const { notice } = useAuth()
  const [signup, setSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!isAllowedEmail(email)) { setError(EMAIL_ERROR); return }
    if (signup && password.length < MIN_PASSWORD_LENGTH) { setError('Use at least 12 characters for your app password.'); return }
    if (signup && password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true); setError('')
    try {
      const client = requireSupabase()
      const credentials = { email: normalizeEmail(email), password }
      const result = signup ? await client.auth.signUp(credentials) : await client.auth.signInWithPassword(credentials)
      if (result.error) throw result.error
      if (!result.data.session) throw new Error('No session was created. Check that Confirm email is OFF in Supabase, then try signing in.')
      setPassword(''); setConfirm('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Authentication failed. Please retry.') }
    finally { setBusy(false) }
  }
  return <AuthShell><span className="eyebrow">Your TUM community</span><h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
    {notice && <p role="status">{notice}</p>}
    <form onSubmit={submit}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
      <label className="field">TUM email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@tum.de" /></label>
      <p className="help">@tum.de or @mytum.de only. This demo does not send email verification.</p>
      <label className="field">App password<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? MIN_PASSWORD_LENGTH : undefined} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <p className="help">Use a password created for Common Ground, not your university password. This is not TUM SSO.</p>
      {signup && <label className="field">Confirm app password<input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>}
      <FormError message={error} /><button className="primary" type="submit">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      <button className="text-button" type="button" onClick={() => { setSignup(!signup); setError(''); setPassword(''); setConfirm('') }}>{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    </fieldset></form></AuthShell>
}
export function LogoutButton() {
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <span><button type="button" className="reset-button" disabled={busy} onClick={async () => {
    setBusy(true); setError('')
    try { await signOut() } catch { setError('Sign out failed. Check your connection and retry.') } finally { setBusy(false) }
  }}>{busy ? 'Signing out…' : 'Sign out'}</button>{error && <span role="alert">{error}</span>}</span>
}
