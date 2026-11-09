import type { CommunityEvent, Profile } from '../types'
import { EVENT_TYPES } from '../data/config'
import { dateLabel, dateTime, isEnded } from '../utils/format'
import { Avatar } from './Avatar'
import { EventArtwork } from './EventArtwork'
import { Icon } from './Icon'
export function EventCard({ event, author, onOpen, onProfile }: { event: CommunityEvent; author: Profile | null; onOpen: () => void; onProfile: () => void }) {
  const ended = isEnded(event)
  return <article className={`feed-card ${ended ? 'ended' : ''}`}>
    <button type="button" className="feed-card-main" onClick={onOpen} aria-label={`${event.title}, ${ended ? 'ended' : 'open'}`}>
      <EventArtwork event={event} />
      <div className="card-body">
        <div className="topline"><span className="tag">{EVENT_TYPES[event.type].label}</span><span className="badge">{ended ? 'Ended' : 'Open'}</span></div>
        <h2>{event.title}</h2><p className="summary">{event.description}</p>
        <div className="meta"><Icon name="calendar" />{['job', 'cofounder'].includes(event.type) ? `Apply by ${dateLabel(event.end)}` : dateTime(event.start)}</div>
        <div className="meta"><Icon name="pin" />{event.location}</div>
        <div className="card-bottom"><span>{event.audience.mode === 'targeted' ? 'Selected audience' : 'Community event'}</span><b>{ended ? `${event.reviews.length} reviews · View event` : 'View details ↗'}</b></div>
      </div>
    </button>
    <div className="feed-person"><Avatar person={author} onClick={onProfile} label={`View ${author?.name ?? event.author}’s profile`} /><button type="button" className="feed-person-name" onClick={onProfile}>{author?.name ?? event.author}</button><span className="tiny">View profile ↗</span></div>
  </article>
}
