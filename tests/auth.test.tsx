import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const fake = vi.hoisted(() => ({
  listener: null as null | ((event: AuthChangeEvent, session: Session | null) => void),
  getSession: vi.fn(), getUser: vi.fn(), refreshSession: vi.fn(), signOut: vi.fn(),
}))
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: {
  getSession: fake.getSession, getUser: fake.getUser, refreshSession: fake.refreshSession, signOut: fake.signOut,
  onAuthStateChange: (callback: typeof fake.listener) => {
    fake.listener = callback
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  },
} } }))
import { AuthProvider } from '../src/auth/AuthProvider'
import { useAuth } from '../src/auth/AuthContext'
const valid = (id = 'a') => ({ user: { id, email: `${id}@tum.de` }, expires_at: Math.floor(Date.now()/1000)+3600 }) as Session
function Probe() {
  const { session, status, notice, retry } = useAuth()
  return <><span data-testid="status">{status}</span><span data-testid="user">{session?.user.id ?? 'none'}</span><span>{notice}</span><button onClick={() => void retry()}>retry</button></>
}
function emit(event: AuthChangeEvent, session: Session | null) { act(() => { fake.listener?.(event, session) }) }
beforeEach(() => {
  vi.clearAllMocks()
  fake.getSession.mockResolvedValue({ data: { session: valid() }, error: null })
  fake.getUser.mockResolvedValue({ data: { user: valid().user }, error: null })
  fake.signOut.mockResolvedValue({ error: null })
})
describe('session lifecycle', () => {
  it('verifies persisted session before allowing the app', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    emit('INITIAL_SESSION', valid())
    expect(screen.getByTestId('status').textContent).toBe('loading')
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'))
    expect(fake.getUser).toHaveBeenCalled()
    expect(screen.getByTestId('user').textContent).toBe('a')
  })
  it('does not let a late account A verification overwrite account B', async () => {
    let resolve!: (value: unknown) => void
    fake.getUser.mockImplementation(() => new Promise(r => { resolve = r }))
    render(<AuthProvider><Probe /></AuthProvider>)
    emit('INITIAL_SESSION', valid('a'))
    await waitFor(() => expect(fake.getUser).toHaveBeenCalled())
    emit('SIGNED_IN', valid('b'))
    await act(async () => { resolve({ data: { user: valid('a').user }, error: null }) })
    expect(screen.getByTestId('user').textContent).toBe('b')
  })
  it('clears current account when another tab signs out', () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    emit('SIGNED_IN', valid()); emit('SIGNED_OUT', null)
    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(screen.getByText(/session has ended/)).toBeTruthy()
  })
  it('keeps refresh credentials on a network error and allows recovery', async () => {
    fake.getUser.mockResolvedValueOnce({ data: { user: null }, error: new TypeError('offline') })
    render(<AuthProvider><Probe /></AuthProvider>)
    emit('INITIAL_SESSION', valid())
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('error'))
    expect(fake.signOut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('retry'))
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('ready'))
  })
  it('rejects a disallowed domain in a session event', () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    const other = { ...valid(), user: { ...valid().user, email: 'a@gmail.com' } } as Session
    emit('SIGNED_IN', other)
    expect(screen.getByTestId('status').textContent).toBe('error')
    expect(screen.getByTestId('user').textContent).toBe('none')
  })
  it('revoked refresh credentials return to login', async () => {
    fake.getSession.mockResolvedValue({ data: { session: null }, error: { code: 'refresh_token_not_found' } })
    render(<AuthProvider><Probe /></AuthProvider>)
    emit('INITIAL_SESSION', valid())
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'))
    expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(screen.getByTestId('status').textContent).toBe('ready')
  })
})
