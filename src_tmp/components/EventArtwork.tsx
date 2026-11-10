import type { CommunityEvent } from '../types'
import { EVENT_TYPES } from '../data/config'
import { Icon } from './Icon'
export function EventArtwork({ event, detail = false, ended = false }: { event: CommunityEvent; detail?: boolean; ended?: boolean }) {
  return <div className={`card-art ${detail ? 'detail-art' : ''} ${ended ? 'ended-art' : event.color}`}><span className="art-title">{event.art || event.title}</span><Icon name={EVENT_TYPES[event.type].icon} /></div>
}
