import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { FEEDS, EVENT_TYPES } from '../data/config'
import { canReadEvent } from '../services/eventRules'
import { EventCard } from '../components/EventCard'
import { Icon } from '../components/Icon'
import type { FeedId } from '../types'
export function EventFeedPage({ feed, onEvent, onProfile }: { feed: FeedId; onEvent: (id: string) => void; onProfile: (id: string) => void }) {
  const { snapshot, role, getPerson } = useCommunity()
  // Re-evaluate ended badges while a feed stays open and after returning to the tab.
  const [, refresh] = useState(0)
  useEffect(() => {
    const tick = () => refresh(n => n + 1)
    const timer = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [])
  const config = FEEDS[feed]
  if (feed === 'notices' && role !== 'organizer') return <><span className="eyebrow">Private workspace</span><h1>Announcements</h1><div className="empty"><Icon name="lock" /><h2>For organizers only</h2><p>This feed is reserved for organizers to read and publish internal announcements.</p></div><p className="small-note">To explore this prototype, change Demo role to Organizer.</p></>
  const events = snapshot.events.filter(e => canReadEvent(e, snapshot.profile, role) && EVENT_TYPES[e.type].feed === feed)
  return <>
    <span className="eyebrow">{config.eyebrow}</span>{snapshot.profile && <p className="personal-hello">Welcome, {snapshot.profile.name}.</p>}
    <h1>{config.title}</h1><p className="intro">{config.intro}</p>
    <div className="hero"><span className="eyebrow">{feed === 'notices' ? 'Organizer access' : 'Meet. Share. Belong.'}</span><h2>{config.hero}</h2><p>{config.sub}</p><div className="hero-foot"><Icon name={feed === 'notices' ? 'lock' : 'people'} /><span>{feed === 'notices' ? 'A space for your organizing team' : 'Made by the community, for the community'}</span></div></div>
    <div className="section-head"><strong>{config.label}</strong><span>{events.length} posts · Latest first</span></div>
    {events.map(event => <EventCard key={event.id} event={event} author={getPerson(event.authorId)} onOpen={() => onEvent(event.id)} onProfile={() => onProfile(event.authorId)} />)}
    {!events.length && <div className="empty"><h2>Your feed starts here.</h2><p>Tap the pencil to share the first event visible to your profile.</p></div>}
    <p className="small-note">Sample community · Times shown in your local timezone<br />Demo role switching is for preview only.</p>
  </>
}
