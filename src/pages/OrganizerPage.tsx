import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { CONTRIBUTIONS, freshOrganizerState, openTo, canAsk, REQUEST_TITLES, REQUEST_STATUS } from '../services/organizer'
import { normalizeMemberText } from '../services/memberDirectory'
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
  const state = store.snapshot.organizer ?? freshOrganizerState(store.userId)
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
  useEffect(() => {
    if (!target && !handover) return
    const previous = document.activeElement as HTMLElement | null
    const panel = document.querySelector<HTMLElement>('.org-sheet')
    const controls = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]') ?? [])
    controls()[0]?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setTarget(null); setHandover(false) }
      if (event.key === 'Tab') { const items=controls(), first=items[0], last=items[items.length-1]; if (event.shiftKey && document.activeElement===first) { event.preventDefault();last?.focus() } else if (!event.shiftKey && document.activeElement===last) { event.preventDefault();first?.focus() } }
    }
    document.addEventListener('keydown',keydown)
    return () => { document.removeEventListener('keydown',keydown);previous?.focus() }
  }, [target, handover])
  if (store.role !== 'organizer') return <div className="empty"><h2>Organizer access only</h2></div>
  const people = [...Object.values(SAMPLE_PROFILES), ...(store.snapshot.profile ? [store.snapshot.profile] : [])]
  const results = people.filter(person => ['green','yellow'].includes(person.contactPreference ?? '') && (!kind || openTo(person).includes(kind)) && (!founder || /founder/i.test(person.occupation)) && normalizeMemberText(person.name).includes(normalizeMemberText(query)))
  const recipients = state.requests.flatMap(item => item.recipients)
  function startRequest(person: Profile) {
    const type = kind || openTo(person)[0] || 'Mentor'
    setTarget(person); setRequestType(type); setTitle(REQUEST_TITLES[type]); setBody(`Hi ${person.name.split(' ')[0]}, would you be open to ${type === 'Speaker' ? 'sharing your founder journey for 20 minutes at our kickoff' : type === 'Jury' ? 'joining our pitch jury at demo day' : type === 'Mentor' ? 'one 45-minute mentoring call with a team' : 'sharing five minutes of feedback on your programme'}?\n\n${store.snapshot.profile?.name ?? ""}`); setError('')
  }
  function send() { if (!target) return; try { store.createRequest(target.id, requestType, title, body); setTarget(null); onNavigate('asks'); notify('Request added to the demo inbox. No email was sent.') } catch (e) { setError(e instanceof Error ? e.message : 'Could not create request.') } }
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
      <div className="section-head"><strong>Your requests</strong><span>{recipients.filter(item=>item.status==='yes').length} yes of {recipients.length}</span></div>
      {state.requests.map(request => <button type="button" key={request.id} className="org-row" onClick={() => onNavigate('asks')}><span><strong>{request.title}</strong><small>{request.recipients.length} asked · {request.recipients.filter(item=>item.status==='yes').length} yes · {request.recipients.filter(item=>item.status==='opened').length} opened</small></span><span className={`request-status ${request.recipients.some(item=>item.status==='yes') ? 'yes' : 'opened'}`}>{request.recipients.some(item=>item.status==='yes') ? 'Answers in' : 'Waiting'}</span></button>)}
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
    {view === 'find' && <><span className="eyebrow">Speakers, jurors, mentors</span><h1>Find alumni</h1><label className="field">Name<input type="search" placeholder="Search alumni…" value={query} onChange={e=>setQuery(e.target.value)} /></label><h3>Open to</h3><div className="filter-chips"><button type="button" className={`interest-button ${!kind ? 'selected' : ''}`} aria-pressed={!kind} onClick={()=>setKind('')}>Anything</button>{CONTRIBUTIONS.map(type=><button type="button" key={type} className={`interest-button ${kind===type ? 'selected' : ''}`} aria-pressed={kind===type} onClick={()=>setKind(type)}>{type}</button>)}</div><label className="org-toggle"><span><strong>Founded a startup</strong><small>Status set by the person</small></span><input type="checkbox" checked={founder} onChange={e=>setFounder(e.target.checked)} /></label><div className="section-head"><strong>Results</strong><span>{results.length} people</span></div><p className="help">People with grey contact are hidden.</p>{results.map(person=><div key={person.id} className="org-row"><img src={photoSource(person.photo)} alt="" /><span><strong>{person.name}</strong><small>{person.occupation}</small><small>{openTo(person).join(' · ') || 'No requests selected'}</small></span><button type="button" className="small-solid" disabled={!openTo(person).length} onClick={()=>startRequest(person)}>Ask</button></div>)}{!results.length && <div className="empty">Nobody matches. Try “Anything”.</div>}</>}
    {view === 'asks' && <><span className="eyebrow">No more chasing</span><h1>Asks</h1><p className="intro">Every request, every answer. Responses are shared across the two demo roles.</p>{state.requests.map(request=><section key={request.id} className="request-card"><header><h2>{request.title}</h2><p>{request.type} · {new Date(request.createdAt).toLocaleDateString('en-GB')}</p></header><p className="request-body">{request.body}</p>{request.recipients.map(recipient=>{const person=people.find(p=>p.id===recipient.personId);return <div key={recipient.personId} className="request-recipient"><div className="org-row"><span><strong>{person?.name ?? (recipient.personId===store.userId ? 'Your registered member profile' : 'Member')}</strong><small>{person?.occupation ?? 'Switch to Member to register and answer'}</small></span><span className={`request-status ${recipient.status}`}>{REQUEST_STATUS[recipient.status]}</span></div>{recipient.personId!==store.userId && <label className="demo-response">Simulate sample response<select aria-label={`Demo response for ${person?.name ?? recipient.personId}`} value={recipient.status} onChange={e=>{try{store.respondRequest(request.id,e.target.value as 'opened'|'yes'|'no',recipient.personId)}catch(err){notify(err instanceof Error ? err.message : 'Could not update.')}}}><option value="delivered" disabled>Delivered</option><option value="opened">Opened</option><option value="yes">Yes</option><option value="no">Not this time</option></select></label>}</div>})}</section>)}</>}
    {target && <div className="org-modal-backdrop" onClick={()=>setTarget(null)}><section className="org-sheet" role="dialog" aria-modal="true" aria-label="Send request" onClick={e=>e.stopPropagation()}><button type="button" className="back" onClick={()=>setTarget(null)}>← Close</button><span className="eyebrow">Request to {target.name}</span><h2>Send a request</h2><label className="field">Request type<select value={requestType} onChange={e=>{const type=e.target.value as ContributionType;setRequestType(type);setTitle(REQUEST_TITLES[type])}}>{openTo(target).map(type=><option key={type}>{type}</option>)}</select></label><label className="field">Title<input value={title} maxLength={150} onChange={e=>setTitle(e.target.value)} /></label><label className="field">Message<textarea value={body} maxLength={2000} onChange={e=>setBody(e.target.value)} /></label><p className="help">Demo delivery to the local inbox. No external email is sent.</p><FormError message={error}/><button type="button" className="primary" disabled={!canAsk(target,requestType)} onClick={send}>Send request</button></section></div>}
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
