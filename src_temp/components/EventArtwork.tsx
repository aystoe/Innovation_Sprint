import type { CommunityEvent } from '../types'
import { eventImage, DEFAULT_EVENT_IMAGE } from '../services/eventImages'
export function EventArtwork({ event, detail = false, ended = false }: { event: CommunityEvent; detail?: boolean; ended?: boolean }) {
  const date = new Date(event.start)
  return <div className={`event-photo ${detail ? 'detail-photo' : ''}`}><img src={eventImage(event)} alt={`Image for ${event.title}`} onError={e=>{ if(e.currentTarget.src!==DEFAULT_EVENT_IMAGE)e.currentTarget.src=DEFAULT_EVENT_IMAGE }} /><span className="photo-date"><b>{date.getDate()}</b><span>{date.toLocaleDateString('en-GB',{month:'short'})}</span></span>{ended && <span className="photo-past">Past</span>}</div>
}
