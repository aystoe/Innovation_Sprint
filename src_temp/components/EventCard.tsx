import type { CommunityEvent } from '../types'
import { EVENT_TYPES } from '../data/config'
import { dateTime, isEnded } from '../utils/format'
import { eventTopics } from '../services/eventInterests'
import { EventArtwork } from './EventArtwork'
import { Icon } from './Icon'
export function EventCard({ event, onOpen }: { event: CommunityEvent; onOpen: () => void }) {
  const ended = isEnded(event)
  return <article className="feed-card compact-event">
    <button type="button" className="feed-card-main" onClick={onOpen} aria-label={`${event.title}, ${dateTime(event.start)}${ended ? ', ended' : ''}. View details`}>
      <EventArtwork event={event} />
      <div className="card-body">
        <h2>{event.title}</h2>
        <div className="meta"><Icon name="calendar" /><time dateTime={event.start}>{dateTime(event.start)}</time></div>
        <div className="event-card-tags"><span className="tag">{EVENT_TYPES[event.type].label}</span>{eventTopics(event).slice(0, 1).map(topic => <span className="tag interest-tag" key={topic}>{topic}</span>)}</div>
      </div>
    </button>
  </article>
}
