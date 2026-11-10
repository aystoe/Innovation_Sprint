import type { FeedId } from '../types'
import { FEEDS } from '../data/config'
import { Icon } from './Icon'
export function BottomNav({ active, onSelect }: { active: FeedId; onSelect: (feed: FeedId) => void }) {
  return <nav className="nav" aria-label="Event feeds">{(Object.keys(FEEDS) as FeedId[]).map(id => <button type="button" key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => onSelect(id)}><span className="nav-icon"><Icon name={FEEDS[id].icon} /></span><span>{FEEDS[id].label}</span></button>)}</nav>
}
