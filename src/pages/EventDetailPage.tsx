import { isDemoMode } from '../lib/dataMode'
import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { EVENT_TYPES } from '../data/config'
import { eventTopics } from '../services/eventInterests'
import { audienceLabel, canReadEvent } from '../services/eventRules'
import { isEnded, dateTime, isWebUrl } from '../utils/format'
import { photoSource } from '../utils/avatar'
import { BackButton } from '../components/BackButton'
import { EventArtwork } from '../components/EventArtwork'
import { ReviewCard } from '../components/ReviewCard'
import { Icon } from '../components/Icon'

function renderDescription(text: string) {
  return text.split(/(https?:\/\/[^\s<>"']+)/g).map((part, index) =>
    isWebUrl(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#0600ff',
          textDecoration: 'underline',
          overflowWrap: 'anywhere',
        }}
      >
        {part}
      </a>
    ) : (
      part
    )
  )
}

export function EventDetailPage({ eventId, onBack, onReview, onRegister, notify, onEdit, onProfile }: { onProfile: (personId: string) => void; onEdit: () => void; eventId: string; onBack: () => void; onReview: () => void; onRegister: () => void; notify: (message: string) => void }) {
  const { snapshot, getPerson, toggleParticipation, role,userId,eventsLoading,eventsError,refreshEvents } = useCommunity()
  const [busy,setBusy]=useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(timer) }, [])
  const event = snapshot.events.find(e => e.id === eventId)
  if(eventsLoading)return <><BackButton onClick={onBack}/><p role="status">Loading event…</p></>
  if(eventsError)return <><BackButton onClick={onBack}/><p role="alert">{eventsError}</p><button className="secondary" onClick={()=>void refreshEvents()}>Retry</button></>
  if (!event || (isDemoMode && !canReadEvent(event, snapshot.profile, role))) return <><BackButton sticky onClick={onBack} /><div className="empty"><h2>This event is unavailable.</h2><p>It may be restricted to another audience.</p></div></>
  const past = isEnded(event), author = getPerson(event.authorId), joined = isDemoMode ? snapshot.profile?.attendedEventIds.includes(event.id) : event.myRegistration==='registered'
  async function join() {
    if(busy || event?.authorId===userId)return
    if (!snapshot.profile) { notify('Register your profile to join events.'); onRegister(); return }
    setBusy(true);try { await toggleParticipation(eventId); notify(joined ? 'In-app application cancelled.' : 'In-app application saved. This does not confirm external registration or attendance.') } catch (e) { notify(e instanceof Error ? e.message : 'Could not update participation.') } finally {setBusy(false)}
  }
  return <><BackButton sticky onClick={onBack} /><EventArtwork event={event} detail ended={past} /><div className="blackbar event-title-bar">{event.title}</div>
    <section className="event-detail-summary"><div className="event-detail-info"><div className="topline"><span className="tag">{EVENT_TYPES[event.type].label}</span><span className="badge">{past ? 'Ended' : 'Open'}</span></div>
    <div className="meta"><Icon name="calendar" />{event.timeConfirmed===false ? `${new Date(event.start).toLocaleDateString('en-GB')} · Time to be confirmed` : dateTime(event.start)}</div><div className="meta"><Icon name="calendar" />{event.timeConfirmed===false ? 'End time to be confirmed' : `Ends: ${dateTime(event.end)}`}</div><div className="meta"><Icon name="pin" />{event.location}</div>
    </div></section>
    <button type="button" className="detail-person organizer-info organizer-profile-button" onClick={()=>onProfile(event.authorId)} aria-label={`View ${author?.name || event.author}’s profile`}><img src={photoSource(author?.photo)} alt="" /><div><span className="organizer-label">Organizer</span><strong>{event.hostLabel || author?.name || event.author}</strong>{event.hostLabel && <small>Posted by {event.author}</small>}</div><span className="organizer-profile-arrow" aria-hidden="true">→</span></button>
    <p className="audience-info">Visible to: {audienceLabel(event)}</p>
    {!isDemoMode && event.authorId===userId && <button className="secondary" onClick={onEdit}>Edit event</button>}
    {event.externalUrl && ['external','both'].includes(event.registrationMode ?? '') && <><a className="primary" href={event.externalUrl} target="_blank" rel="noopener noreferrer">Open external registration ↗</a><p className="help">Complete the application on the external site. Opening this link does not register you.</p></>}
    {!['job','cofounder','announcement'].includes(event.type) && ['internal','both'].includes(event.registrationMode ?? 'internal') && <>
      <div className="event-applicants" role="status" aria-live="polite">
        <strong className="event-applicants-count">{event.registeredCount ?? 0}</strong>
        <div><span className="event-applicants-label">{event.registeredCount===1 ? 'Applicant' : 'Applicants'}</span><span className="event-applicants-note">In-app applications{event.capacity ? ` · ${event.capacity} places` : ''}</span></div>
      </div>
      {event.registrationMode==='both' && <p className="help">External registration is separate.</p>}
      {event.authorId!==userId && <button type="button" className={`primary join-button ${joined ? 'is-joined' : ''}`} disabled={busy || !!event.myAttended || (!joined && (past || !!event.capacity && (event.registeredCount ?? 0)>=event.capacity))} aria-pressed={!!joined} onClick={()=>void join()}>{busy ? 'Saving…' : event.myAttended ? 'Attendance recorded' : joined ? 'Applied in app · Cancel' : past ? 'Applications closed' : 'Apply in app'}</button>}
    </>}
    <div className="filter-chips" aria-label="Event interests">{eventTopics(event).map(topic => <span className="interest-button" key={topic}>{topic}</span>)}</div>
    <p className="detail-copy">{renderDescription(event.description)}</p>
    {past && isDemoMode && <><div className="ended-banner">This event has ended. Share your memories and feedback with the community.</div><button type="button" className="primary" onClick={onReview}><Icon name="star" />Add a review</button></>}
    <div className="section-head"><strong>{isDemoMode ? 'Community reviews' : 'Reviews are not connected yet'}</strong><span>{event.reviews.length} {event.reviews.length === 1 ? 'review' : 'reviews'}</span></div>
    {event.reviews.map(review => <ReviewCard key={review.id} review={review} />)}
    {isDemoMode && !event.reviews.length && <p className="intro">{past ? 'No reviews yet. Be the first to share a memory.' : 'Reviews open after the event ends.'}</p>}
  </>
}
