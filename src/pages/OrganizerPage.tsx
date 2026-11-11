import { useEffect, useRef, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { findOrganizerPeople, sendOrganizerRequest } from '../services/organizerLive'
import { CONTRIBUTIONS, openTo, canAsk, REQUEST_TITLES } from '../services/organizer'
import { LiveRequests } from '../components/LiveRequests'
import { photoSource } from '../utils/avatar'
import { V3_IMAGES } from '../services/eventImages'
import { FormError } from '../components/FormError'
import type { ContributionType, Profile } from '../types'
import { requireSupabase } from '../lib/supabase'

interface OrganizerStats {
  registered_members: number
  open_contributors: number
  new_members_last_7_days: number
}

const SLACK_CHANNEL_URL: string = 'https://utum-techtalents.slack.com/archives/C0BSMJEE04X'

interface Props { view: 'room' | 'find' | 'asks'; onNavigate: (view: 'room' | 'find' | 'asks' | 'create') => void; onFeed: (feed: 'official' | 'social') => void; notify: (message: string) => void }
export function OrganizerPage({ view, onNavigate, onFeed, notify }: Props) {
  const store = useCommunity()
  const [kind, setKind] = useState<ContributionType | ''>('')
  const [founder, setFounder] = useState(false), [query, setQuery] = useState('')
  const [target, setTarget] = useState<Profile | null>(null)
  const [requestType, setRequestType] = useState<ContributionType>('Mentor')
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [error, setError] = useState('')
  const [handover, setHandover] = useState(false)
  const [stats, setStats] = useState<OrganizerStats | null>(null)
const [statsLoading, setStatsLoading] = useState(true)
const [statsError, setStatsError] = useState('')
const [statsAttempt, setStatsAttempt] = useState(0)

useEffect(() => {
  if (store.role !== 'organizer' || view !== 'room') return

  const controller = new AbortController()
  let inFlight = false

  async function loadStats() {
    if (inFlight || controller.signal.aborted) return
    inFlight = true

    try {
      const { data, error } = await requireSupabase()
        .rpc('organizer_stats')
        .abortSignal(controller.signal)

      if (error) throw error

      const keys = [
        'registered_members',
        'open_contributors',
        'new_members_last_7_days',
      ] as const

      if (
        !data ||
        !keys.every(
          key => Number.isSafeInteger(data[key]) && data[key] >= 0,
        )
      ) {
        throw new Error('Invalid statistics response.')
      }

      if (!controller.signal.aborted) {
        setStats(data as OrganizerStats)
        setStatsError('')
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setStats(null)
        setStatsError(
          cause instanceof Error
            ? cause.message
            : 'Could not load community statistics.',
        )
      }
    } finally {
      inFlight = false

      if (!controller.signal.aborted) {
        setStatsLoading(false)
      }
    }
  }

  setStatsLoading(true)
  setStatsError('')
  void loadStats()

  const refresh = () => {
    if (document.visibilityState !== 'hidden') {
      void loadStats()
    }
  }

  const timer = window.setInterval(refresh, 30_000)

  window.addEventListener('focus', refresh)
  window.addEventListener('app:resume', refresh)

  return () => {
    controller.abort()
    window.clearInterval(timer)
    window.removeEventListener('focus', refresh)
    window.removeEventListener('app:resume', refresh)
  }
}, [store.userId, store.role, view, statsAttempt])
  const [results, setResults] = useState<Profile[]>([]), [total, setTotal] = useState(0)
  const [page, setPage] = useState(0), [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true), [searchError, setSearchError] = useState('')
  const [sending, setSending] = useState(false), [attempted, setAttempted] = useState(false)
  const sendingLock = useRef(false), requestKey = useRef(''), active = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    if (view !== 'find') return
    const abort = new AbortController()
    setLoading(true); setSearchError(''); setResults([])
    const timer = window.setTimeout(async () => {
      try {
        const result = await findOrganizerPeople(query, kind, founder, page, abort.signal)
        if (!abort.signal.aborted) { setResults(result.people); setTotal(result.total) }
      } catch (cause) { if (!abort.signal.aborted) setSearchError(cause instanceof Error ? cause.message : 'Could not load members. Please retry.') }
      finally { if (!abort.signal.aborted) setLoading(false) }
    }, 300)
    return () => { clearTimeout(timer); abort.abort() }
  }, [view, query, kind, founder, page, revision, store.userId])

  useEffect(() => {
    if (!target && !handover) return
    const previous = document.activeElement as HTMLElement | null
    const panel = document.querySelector<HTMLElement>('.org-sheet')
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]') ?? [])
    controls()[0]?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sendingLock.current) { setTarget(null); setHandover(false) }
      if (event.key === 'Tab') { const items=controls(), first=items[0], last=items[items.length-1]; if (event.shiftKey && document.activeElement===first) { event.preventDefault();last?.focus() } else if (!event.shiftKey && document.activeElement===last) { event.preventDefault();first?.focus() } }
    }
    document.addEventListener('keydown',keydown)
    return () => { document.removeEventListener('keydown',keydown);previous?.focus() }
  }, [target, handover])
  if (store.role !== 'organizer') return <div className="empty"><h2>Organizer access only</h2></div>
  function startRequest(person: Profile) {
    requestKey.current = crypto.randomUUID(); setAttempted(false)
    const type = kind || openTo(person)[0] || 'Mentor'
    setTarget(person); setRequestType(type); setTitle(REQUEST_TITLES[type]); setBody(`Hi ${person.name.split(' ')[0]}, would you be open to ${type === 'Speaker' ? 'sharing your founder journey for 20 minutes at our kickoff' : type === 'Jury' ? 'joining our pitch jury at demo day' : type === 'Mentor' ? 'one 45-minute mentoring call with a team' : 'sharing five minutes of feedback on your programme'}?\n\n${store.snapshot.profile?.name ?? ""}`); setError('')
  }
  async function send() {
    if (!target || sendingLock.current) return
    sendingLock.current = true; setSending(true); setAttempted(true); setError('')
    try {
      await sendOrganizerRequest(store.userId, target.id, requestType, title, body, requestKey.current)
      if (active.current) { setTarget(null); onNavigate('asks'); notify('Request sent to the member’s in-app inbox.') }
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Could not send. Please retry.') }
    finally { sendingLock.current = false; if (active.current) setSending(false) }
  }
  return <>
    {view === 'room' && <>
      <div className="org-hero"><img src={V3_IMAGES.hall} alt="Community hall" /><div className="blackbar">Hello, {store.snapshot.profile?.name}</div></div>
      <span className="eyebrow block">
        Your community at a glance
      </span>

      {statsLoading ? (
        <p className="help" role="status">
          Loading community statistics…
        </p>
      ) : statsError ? (
        <div role="alert">
          <FormError message={statsError} />

          <button
            type="button"
            className="secondary"
            onClick={() => setStatsAttempt(value => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : stats ? (
        <div className="org-kpis">
          <div>
            <b>{stats.registered_members.toLocaleString('en-GB')}</b>
            <span>registered members</span>
          </div>

          <div>
            <b>—</b>
            <span>weekly digest not enabled yet</span>
          </div>

          <div>
            <b>{stats.open_contributors.toLocaleString('en-GB')}</b>
            <span>open to talks, jury, mentoring</span>
          </div>

          <div>
            <b>
              {stats.new_members_last_7_days.toLocaleString('en-GB')}
            </b>
            <span>joined in the last 7 days</span>
          </div>
        </div>
      ) : null}
      <div className="bluebox">
        <span className="eyebrow">
          Upcoming cohort handover
        </span>

        <h2>Innovation Sprint 26w ends</h2>

        <p>
          Stay connected with your cohort through Slack.
        </p>

        <button
          type="button"
          className="lime-button"
          onClick={() => setHandover(true)}
        >
          {SLACK_CHANNEL_URL
            ? 'Open Slack channel'
            : 'View Slack handover demo'}
        </button>
          </div>
          <LiveRequests key={store.userId} direction="sent" />
          <div className="section-head">
      <strong>Weekly digest</strong>
      <span>Not enabled</span>
    </div>

    <p className="intro">
      Email delivery is not enabled in this demo.
      Posts are available in the app.
    </p>
      <div className="section-head"><strong>Browse community</strong></div><div className="org-feed-links"><button type="button" className="secondary" onClick={() => onFeed('official')}>Opportunities</button><button type="button" className="secondary" onClick={() => onFeed('social')}>Social Events</button></div>
    </>}
    {view === 'find' && <><span className="eyebrow">Speakers, jurors, mentors</span><h1>Find people</h1><label className="field">Name<input type="search" placeholder="Search members…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} /></label><h3>Open to</h3><div className="filter-chips"><button type="button" className={`interest-button ${!kind ? 'selected' : ''}`} aria-pressed={!kind} onClick={()=>{setKind('');setPage(0)}}>Anything</button>{CONTRIBUTIONS.map(type=><button type="button" key={type} className={`interest-button ${kind===type ? 'selected' : ''}`} aria-pressed={kind===type} onClick={()=>{setKind(type);setPage(0)}}>{type}</button>)}</div><label className="org-toggle"><span><strong>Founded a startup</strong><small>Status set by the person</small></span><input type="checkbox" checked={founder} onChange={e=>{setFounder(e.target.checked);setPage(0)}} /></label><div className="section-head"><button type="button" className="small-solid" onClick={()=>setRevision(v=>v+1)} disabled={loading}>Results</button><span>{loading ? 'Loading…' : `${total} people`}</span></div><p className="help">People with grey contact are hidden. Showing registered members only.</p><FormError message={searchError}/>{searchError && <button type="button" className="secondary" onClick={()=>setRevision(v=>v+1)}>Retry</button>}{results.map(person=><div key={person.id} className="org-row"><img src={photoSource(person.photo)} alt="" /><span><strong>{person.name}</strong><small>{person.occupation}</small><small>{openTo(person).join(' · ') || 'No requests selected'}</small></span><button type="button" className="small-solid" disabled={person.id === store.userId || !openTo(person).length} title={person.id === store.userId ? "Your profile" : !openTo(person).length ? "This member has not selected any request types" : "Send an in-app request"} onClick={()=>startRequest(person)}>Ask</button></div>)}{!loading && !searchError && !results.length && <div className="empty">Nobody matches. Try “Anything”.</div>}{total > 20 && <div className="request-actions"><button type="button" className="secondary" disabled={loading || page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>{page+1} / {Math.ceil(total/20)}</span><button type="button" className="secondary" disabled={loading || (page+1)*20>=total} onClick={()=>setPage(p=>p+1)}>Next</button></div>}</>}
    {view === 'asks' && <><span className="eyebrow">Your requests and answers</span><h1>Asks</h1><p className="intro">Requests are delivered in the app. Only the recipient can answer.</p><LiveRequests key={`${store.userId}-sent`} direction="sent" /><LiveRequests key={`${store.userId}-received`} direction="received" /></>}
    {target && <div className="org-modal-backdrop" onClick={()=>{if(!sendingLock.current)setTarget(null)}}><section className="org-sheet" role="dialog" aria-modal="true" aria-label="Send request" onClick={e=>e.stopPropagation()}><button type="button" className="back" onClick={()=>{if(!sendingLock.current)setTarget(null)}}>← Close</button><span className="eyebrow">Request to {target.name}</span><h2>Send a request</h2><label className="field">Request type<select disabled={sending || attempted} value={requestType} onChange={e=>{const type=e.target.value as ContributionType;setRequestType(type);setTitle(REQUEST_TITLES[type])}}>{openTo(target).map(type=><option key={type}>{type}</option>)}</select></label><label className="field">Title<input disabled={sending || attempted} value={title} maxLength={150} onChange={e=>setTitle(e.target.value)} /></label><label className="field">Message<textarea disabled={sending || attempted} value={body} maxLength={2000} onChange={e=>setBody(e.target.value)} /></label><p className="help">Delivered to this member’s in-app requests. No email is sent. If sending fails, retry the same request; close and reopen to write a different request.</p><FormError message={error}/><button type="button" className="primary" disabled={sending || !title.trim() || !body.trim() || !canAsk(target,requestType)} onClick={()=>void send()}>{sending ? 'Sending…' : 'Send request'}</button></section></div>}
    {handover && (
      <div
        className="org-modal-backdrop"
        onClick={() => setHandover(false)}
      >
        <section
          className="org-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Cohort handover"
          onClick={event => event.stopPropagation()}
        >
          <button
            type="button"
            className="back"
            onClick={() => setHandover(false)}
          >
            ← Close
          </button>

          <span className="eyebrow">
            Innovation Sprint 26w
          </span>

          <h2>Stay connected on Slack</h2>

          {SLACK_CHANNEL_URL ? (
            <>
              <p className="intro">
                Open the cohort channel in your existing Slack workspace.
              </p>

              <a
                className="primary"
                href={SLACK_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Slack channel ↗
              </a>

              <p className="help">
                You may need to sign in to the workspace.
                Private channels require membership.
              </p>
            </>
          ) : (
            <>
              <p className="intro">
                In the full version, this would redirect you
                to the cohort’s Slack channel.
              </p>

              <p className="help">
                Slack integration is not connected in this demo.
                No invitation or channel access has been created.
              </p>

              <button
                type="button"
                className="primary"
                onClick={() => setHandover(false)}
              >
                Got it
              </button>
            </>
          )}
        </section>
      </div>
    )}
  </>
}
