import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { EVENT_TYPES } from '../data/config'
import { eventTopics } from '../services/eventInterests'
import { audienceLabel, canReadEvent } from '../services/eventRules'
import { isEnded, dateTime } from '../utils/format'
import { photoSource } from '../utils/avatar'
import { BackButton } from '../components/BackButton'
import { EventArtwork } from '../components/EventArtwork'
import { ReviewCard } from '../components/ReviewCard'
import { Icon } from '../components/Icon'
export function EventDetailPage({ eventId, onBack, onReview, onRegister, notify }: { eventId: string; onBack: () => void; onReview: () => void; onRegister: () => void; notify: (message: string) => void }) {
  const { snapshot, getPerson, toggleParticipation, role } = useCommunity()
  const [, tick] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(timer) }, [])
  const event = snapshot.events.find(e => e.id === eventId)
  if (!event || !canReadEvent(event, snapshot.profile, role)) return <><BackButton sticky onClick={onBack} /><div className="empty"><h2>This event is unavailable.</h2><p>It may be restricted to another audience.</p></div></>
  const past = isEnded(event), author = getPerson(event.authorId), joined = snapshot.profile?.attendedEventIds.includes(event.id)
  function join() {
    if (!snapshot.profile) { notify('Register your profile to join events.'); onRegister(); return }
    try { toggleParticipation(eventId); notify(joined ? 'You have left this event.' : 'Event added to your participation history.') } catch (e) { notify(e instanceof Error ? e.message : 'Could not update participation.') }
  }
  return <><BackButton sticky onClick={onBack} /><EventArtwork event={event} detail ended={past} /><div className="blackbar event-title-bar">{event.title}</div>
    <section className="event-detail-summary"><div className="event-detail-info"><div className="topline"><span className="tag">{EVENT_TYPES[event.type].label}</span><span className="badge">{past ? 'Ended' : 'Open'}</span></div>
    <div className="meta"><Icon name="calendar" />{dateTime(event.start)}</div><div className="meta"><Icon name="calendar" />Ends: {dateTime(event.end)}</div><div className="meta"><Icon name="pin" />{event.location}</div>
    </div></section>
    <div className="detail-person organizer-info"><img src={photoSource(author?.photo)} alt="" /><div><span className="organizer-label">Organizer</span><strong>{author?.name ?? event.author}</strong></div></div>
    <p className="audience-info">Visible to: {audienceLabel(event)}</p>
    {!['job', 'cofounder', 'announcement'].includes(event.type) && <button type="button" className={`primary join-button ${joined ? 'is-joined' : ''}`} aria-pressed={!!joined} onClick={join}>{joined ? 'Joined · Leave event' : past ? 'I attended this event' : 'Join event'}</button>}
    <div className="filter-chips" aria-label="Event interests">{eventTopics(event).map(topic => <span className="interest-button" key={topic}>{topic}</span>)}</div>
    <p className="detail-copy">{event.description}</p>
    {past && <><div className="ended-banner">This event has ended. Share your memories and feedback with the community.</div><button type="button" className="primary" onClick={onReview}><Icon name="star" />Add a review</button></>}
    <div className="section-head"><strong>Community reviews</strong><span>{event.reviews.length} {event.reviews.length === 1 ? 'review' : 'reviews'}</span></div>
    {event.reviews.map(review => <ReviewCard key={review.id} review={review} />)}
    {!event.reviews.length && <p className="intro">{past ? 'No reviews yet. Be the first to share a memory.' : 'Reviews open after the event ends.'}</p>}
  </>
}
