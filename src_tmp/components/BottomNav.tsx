import type { FeedId, NavigationId } from '../types'
import { FEEDS } from '../data/config'
import { Icon } from './Icon'
export function BottomNav({ active, onSelect }: { active: NavigationId; onSelect: (feed: NavigationId) => void }) {
  return <nav className="nav" aria-label="Event feeds">{(Object.keys(FEEDS) as FeedId[]).map(id => <button type="button" key={id} className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => onSelect(id)}><span className="nav-icon"><Icon name={FEEDS[id].icon} /></span><span>{FEEDS[id].label}</span></button>)}<button type="button" className={active === 'leaderboard' ? 'active' : ''} aria-current={active === 'leaderboard' ? 'page' : undefined} onClick={() => onSelect('leaderboard')}><span className="nav-icon"><Icon name="trophy" /></span><span>Leaderboard</span></button></nav>
}
