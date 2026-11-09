import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { EVENT_TYPES } from '../data/config'
import { audienceLabel, canReadEvent } from '../services/eventRules'
import { isEnded, dateTime } from '../utils/format'
import { Avatar } from '../components/Avatar'
import { BackButton } from '../components/BackButton'
import { EventArtwork } from '../components/EventArtwork'
import { ReviewCard } from '../components/ReviewCard'
import { Icon } from '../components/Icon'
export function EventDetailPage({ eventId, onBack, onProfile, onReview, onRegister, notify }: { eventId: string; onBack: () => void; onProfile: (id: string) => void; onReview: () => void; onRegister: () => void; notify: (message: string) => void }) {
  const { snapshot, role, getPerson, toggleParticipation } = useCommunity()
  const [, tick] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(timer) }, [])
  const event = snapshot.events.find(e => e.id === eventId)
  if (!event || !canReadEvent(event, snapshot.profile, role)) return <><BackButton onClick={onBack} /><div className="empty"><h2>This event is unavailable.</h2><p>It may be restricted to another audience.</p></div></>
  const past = isEnded(event), author = getPerson(event.authorId), joined = snapshot.profile?.attendedEventIds.includes(event.id)
  function join() {
    if (!snapshot.profile) { notify('Register your profile to join events.'); onRegister(); return }
    try { toggleParticipation(eventId); notify(joined ? 'You have left this event.' : 'Event added to your participation history.') } catch (e) { notify(e instanceof Error ? e.message : 'Could not update participation.') }
  }
  return <><BackButton onClick={onBack} /><EventArtwork event={event} detail ended={past} />
    <div className="topline"><span className="tag">{EVENT_TYPES[event.type].label}</span><span className="badge">{past ? 'Ended' : 'Open'}</span></div><h1>{event.title}</h1>
    <div className="meta"><Icon name="calendar" />{dateTime(event.start)}</div><div className="meta"><Icon name="calendar" />Ends: {dateTime(event.end)}</div><div className="meta"><Icon name="pin" />{event.location}</div>
    <div className="detail-person"><Avatar person={author} onClick={() => onProfile(event.authorId)} label="View event organizer profile" /><button type="button" onClick={() => onProfile(event.authorId)}>{author?.name ?? event.author}</button></div>
    <p className="audience-info">Visible to: {audienceLabel(event)}</p>
    {!['job', 'cofounder', 'announcement'].includes(event.type) && <button type="button" className="secondary" onClick={join}>{joined ? 'Joined · Leave event' : past ? 'I attended this event' : 'Join event'}</button>}
    <p className="detail-copy">{event.description}</p>
    {past && <><div className="ended-banner">This event has ended. Share your memories and feedback with the community.</div><button type="button" className="primary" onClick={onReview}><Icon name="star" />Add a review</button></>}
    <div className="section-head"><strong>Community reviews</strong><span>{event.reviews.length} {event.reviews.length === 1 ? 'review' : 'reviews'}</span></div>
    {event.reviews.map(review => <ReviewCard key={review.id} review={review} />)}
    {!event.reviews.length && <p className="intro">{past ? 'No reviews yet. Be the first to share a memory.' : 'Reviews open after the event ends.'}</p>}
  </>
}
