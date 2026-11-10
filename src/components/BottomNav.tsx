import type { NavigationId, Role, IconName } from '../types'
import { Icon } from './Icon'
const MEMBER_ITEMS: {id:NavigationId;label:string;icon:IconName}[] = [
  {id:'official',label:'Opportunities',icon:'bag'}, {id:'social',label:'Social Events',icon:'calendar'}, {id:'create',label:'Create',icon:'plus'}, {id:'members',label:'Members',icon:'people'}, {id:'chats',label:'Chatting',icon:'chat'},
]
const ORGANIZER_ITEMS: {id:NavigationId;label:string;icon:IconName}[] = [
  {id:'room',label:'Room',icon:'home'}, {id:'create',label:'Post',icon:'plus'}, {id:'find',label:'Find',icon:'search'}, {id:'asks',label:'Asks',icon:'notice'},
]
export function BottomNav({ active, onSelect, role }: { active: NavigationId|null; onSelect:(id:NavigationId)=>void; role:Role }) {
  const items = role==='organizer' ? ORGANIZER_ITEMS : MEMBER_ITEMS
  return <nav className={`nav v3-nav ${role==='organizer'?'organizer-nav':'member-nav'}`} aria-label="Community navigation">{items.map(item=><button type="button" className={active===item.id?'active':''} key={item.id} aria-current={active===item.id?'page':undefined} onClick={()=>onSelect(item.id)}><span className="nav-icon"><Icon name={item.icon}/></span><span>{item.label}</span></button>)}</nav>
}
