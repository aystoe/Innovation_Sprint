import type { CommunityEvent } from '../types'
import { EVENT_TYPES } from '../data/config'
import { dateTime, isEnded } from '../utils/format'
import { eventTopics } from '../services/eventInterests'
import { EventArtwork } from './EventArtwork'
export function EventCard({ event, onOpen }: { event: CommunityEvent; onOpen: () => void }) {
  return <article className="feed-card compact-event"><button type="button" className="feed-card-main" onClick={onOpen} aria-label={`${event.title}. View details`}><EventArtwork event={event} ended={isEnded(event)} /><div className="card-body"><div className="event-card-tags"><span className="tag">{EVENT_TYPES[event.type].label}</span>{eventTopics(event).slice(0,2).map(topic=><span className="tag interest-tag" key={topic}>{topic}</span>)}</div><h2>{event.title}</h2><div className="meta"><time dateTime={event.start}>{dateTime(event.start)}</time></div><div className="meta">{event.location}</div></div></button></article>
}
