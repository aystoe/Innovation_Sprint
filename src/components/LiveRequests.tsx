import { useEffect, useRef, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { answerOrganizerRequest, listOrganizerRequests, type LiveRequest } from '../services/organizerLive'
import { REQUEST_STATUS } from '../services/organizer'
import { FormError } from './FormError'

export function LiveRequests({ direction }: { direction: 'sent' | 'received' }) {
  const { userId } = useCommunity()
  const [rows, setRows] = useState<LiveRequest[]>([]), [page, setPage] = useState(0), [total, setTotal] = useState(0)
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState('')
  const [revision, setRevision] = useState(0)
  const lock = useRef(false), mounted = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    const abort = new AbortController()
    let pending = false
    setRows([]); setLoading(true); setError('')
    async function refresh() {
      if (pending || abort.signal.aborted) return
      pending = true
      try {
        const result = await listOrganizerRequests(userId, direction, page, abort.signal)
        if (!abort.signal.aborted) { setRows(result.requests); setTotal(result.total); setError('') }
      } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load requests. Please retry.') }
      finally { pending = false; if (!abort.signal.aborted) setLoading(false) }
    }
    void refresh()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 15000)
    const resume = () => { void refresh() }
    window.addEventListener('focus', resume); window.addEventListener('app:resume', resume)
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', resume); window.removeEventListener('app:resume', resume) }
  }, [userId, direction, page, revision])
  async function answer(row: LiveRequest, status: 'yes' | 'no') {
    if (lock.current) return
    lock.current = true; setBusy(row.id); setError('')
    try {
      await answerOrganizerRequest(row.id, status)
      if (mounted.current) setRevision(value => value + 1)
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not save your answer. Retry.') }
    finally { lock.current = false; if (mounted.current) setBusy('') }
  }
  return <section className="member-requests"><div className="section-head"><strong>{direction === 'received' ? 'Received requests' : 'Sent requests'}</strong><span>{total}</span></div>
    <FormError message={error}/>{error && <button type="button" className="secondary" onClick={() => setRevision(v => v + 1)}>Retry</button>}
    {loading && <p role="status">Loading requests…</p>}
    {!loading && !error && !rows.length && <p className="help">No requests yet.</p>}
    {rows.map(row => <article className="request-card" key={row.id}><header><small>{direction === 'received' ? `From ${row.sender?.name ?? 'Member'}` : `To ${row.recipient?.name ?? 'Member'}`} · {row.contribution_type}</small><h2>{row.title}</h2><span className={`request-status ${row.status}`}>{REQUEST_STATUS[row.status]}</span></header><p className="request-body">{row.body}</p><small>{new Date(row.created_at).toLocaleString()}</small>
      {direction === 'received' && row.recipient_id === userId && <div className="request-actions"><button type="button" className="primary" disabled={!!busy} aria-pressed={row.status === 'yes'} onClick={() => void answer(row,'yes')}>{busy === row.id ? 'Saving…' : 'Yes'}</button><button type="button" className="secondary" disabled={!!busy} aria-pressed={row.status === 'no'} onClick={() => void answer(row,'no')}>Not this time</button></div>}
    </article>)}
    {total > 20 && <div className="request-actions"><button type="button" className="secondary" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>{page + 1} / {Math.max(1, Math.ceil(total / 20))}</span><button type="button" className="secondary" disabled={(page + 1) * 20 >= total || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>}
  </section>
}
