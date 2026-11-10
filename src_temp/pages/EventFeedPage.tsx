import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { FEEDS, EVENT_TYPES, TOPICS } from '../data/config'
import { eventTopics, matchesInterests, profileInterests, uniqueInterests } from '../services/eventInterests'
import { sortEventsByDate } from '../services/eventOrder'
import { canReadEvent } from '../services/eventRules'
import { EventCard } from '../components/EventCard'
import { FilterPanel } from '../components/FilterPanel'
import { InterestPicker } from '../components/InterestPicker'
import type { FeedId } from '../types'

export function EventFeedPage({ feed, onEvent }: { feed: FeedId; onEvent: (id: string) => void }) {
  const { snapshot, role } = useCommunity()
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'custom'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [, refresh] = useState(0)
  useEffect(() => {
    const tick = () => refresh(value => value + 1)
    const timer = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [])
  const accessibleEvents = snapshot.events.filter(event => EVENT_TYPES[event.type].feed === feed && canReadEvent(event, snapshot.profile))
  const mine = profileInterests(snapshot.profile)
  const options = uniqueInterests([...TOPICS, ...mine, ...accessibleEvents.flatMap(eventTopics)])
  const activeInterests = filterMode === 'mine' ? mine : selected
  const events = sortEventsByDate(filterMode === 'all' ? accessibleEvents : accessibleEvents.filter(event => matchesInterests(event, activeInterests)))
  function clear() { setFilterMode('all'); setSelected([]) }
  function toggleInterest(topic: string) {
    const base = filterMode === 'mine' ? mine : selected
    const next = base.includes(topic) ? base.filter(t => t !== topic) : [...base, topic]
    setSelected(next); setFilterMode(next.length ? 'custom' : 'all')
  }
  const canCreate = feed !== 'notices' || role === 'organizer'
  const active = filterMode === 'all' ? [] : filterMode === 'mine'
    ? [{ id: 'mine', label: 'My interests', onRemove: clear }]
    : activeInterests.map(topic => ({ id: topic, label: topic, onRemove: () => toggleInterest(topic) }))
  return <>
    <h1 className="feed-title">{FEEDS[feed].label}</h1>
    <p className="intro">{FEEDS[feed].intro}</p>
    <div className="feed-filter-modes" role="group" aria-label="Event recommendations"><button type="button" aria-pressed={filterMode === 'all'} className={filterMode === 'all' ? 'selected' : ''} onClick={clear}>All events</button><button type="button" aria-pressed={filterMode === 'mine'} className={filterMode === 'mine' ? 'selected' : ''} onClick={() => setFilterMode('mine')}>My interests</button></div>
    <FilterPanel label="Interest filters" active={active} onClear={clear}>
      <p className="filter-instruction">Choose the interests you want to see. Match any selected interest.</p>
      <InterestPicker options={options} selected={filterMode === 'all' ? [] : activeInterests} onToggle={toggleInterest} />
    </FilterPanel>
    {filterMode === 'mine' && !mine.length && <p className="filter-guidance">Add interests in Edit profile, or choose an interest using the filter button.</p>}
    <div className="section-head"><strong role="status" aria-live="polite">{events.length} {events.length === 1 ? 'event' : 'events'}</strong><span>Date · Earliest first</span></div>
    {events.map(event => <EventCard key={event.id} event={event} onOpen={() => onEvent(event.id)} />)}
    {events.length === 0 && <div className="empty"><p>{filterMode !== 'all' ? 'No events match these interests. Try another interest or clear the filters.' : canCreate ? 'No events yet. Tap the pencil to create one.' : 'No events yet.'}</p>{filterMode !== 'all' && <button type="button" className="secondary" onClick={clear}>Show all events</button>}</div>}
  </>
}
