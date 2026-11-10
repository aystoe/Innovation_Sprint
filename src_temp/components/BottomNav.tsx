import type { NavigationId } from '../types'
import { FEEDS } from '../data/config'
import { Icon } from './Icon'

const ITEMS = [
  { id: 'official', label: FEEDS.official.label, icon: FEEDS.official.icon },
  { id: 'social', label: FEEDS.social.label, icon: FEEDS.social.icon },
  { id: 'members', label: 'Members', icon: 'search' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
] as const
export function BottomNav({ active, onSelect }: { active: NavigationId; onSelect: (id: NavigationId) => void }) {
  return <nav className="nav" aria-label="Community navigation">{ITEMS.map(item => <button type="button" key={item.id} className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => onSelect(item.id)}><span className="nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span></button>)}</nav>
}
