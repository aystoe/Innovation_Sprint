import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { FEEDS, EVENT_TYPES, TOPICS } from '../data/config'
import { eventTopics, matchesInterests, profileInterests, uniqueInterests } from '../services/eventInterests'
import { canReadEvent } from '../services/eventRules'
import { EventCard } from '../components/EventCard'
import type { FeedId } from '../types'

interface Props {
  feed: FeedId
  onEvent: (id: string) => void
  onProfile: (id: string) => void
}

export function EventFeedPage({
  feed,
  onEvent,
  onProfile,
}: Props) {
  const { snapshot, role, getPerson } = useCommunity()
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'custom'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [, refresh] = useState(0)

  useEffect(() => {
    const tick = () => refresh(value => value + 1)

    const timer = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const accessibleEvents = snapshot.events.filter(
    event =>
      EVENT_TYPES[event.type].feed === feed &&
      canReadEvent(event, snapshot.profile)
  )

  const mine = profileInterests(snapshot.profile)
  const options = uniqueInterests([...TOPICS, ...mine, ...accessibleEvents.flatMap(eventTopics)])
  const activeInterests = filterMode === 'mine' ? mine : selected
  const events = filterMode === 'all' ? accessibleEvents : accessibleEvents.filter(event => matchesInterests(event, activeInterests))
  function toggleInterest(topic: string) {
    const base = filterMode === 'mine' ? mine : selected
    const next = base.includes(topic) ? base.filter(t => t !== topic) : [...base, topic]
    setSelected(next)
    setFilterMode(next.length ? 'custom' : 'all')
  }

  const canCreate =
    feed !== 'notices' || role === 'organizer'

  return (
    <>
      <div className="section-head">
        <strong>{FEEDS[feed].label}</strong>
        <span>{events.length} posts · Latest first</span>
      </div>

      <fieldset className="interest-filter"><legend>Filter by interests</legend>
        <div className="filter-chips"><button type="button" className={`interest-button ${filterMode === 'all' ? 'selected' : ''}`} aria-pressed={filterMode === 'all'} onClick={() => { setFilterMode('all'); setSelected([]) }}>All interests</button><button type="button" className={`interest-button ${filterMode === 'mine' ? 'selected' : ''}`} aria-pressed={filterMode === 'mine'} onClick={() => setFilterMode('mine')}>My interests</button></div>
        <details><summary>Choose interests{filterMode !== 'all' ? ` (${activeInterests.length})` : ''}</summary><div className="filter-chips">{options.map(topic => <button type="button" key={topic} className={`interest-button ${filterMode !== 'all' && activeInterests.includes(topic) ? 'selected' : ''}`} aria-pressed={filterMode !== 'all' && activeInterests.includes(topic)} onClick={() => toggleInterest(topic)}>{topic}</button>)}</div></details>
        <p className="help" role="status">{filterMode === 'all' ? 'Showing all accessible posts.' : filterMode === 'mine' && !mine.length ? 'Add interests in your profile, or choose interests below.' : `Matching any of: ${activeInterests.join(', ')}`}</p>
      </fieldset>

      {events.map(event => (
        <EventCard
          key={event.id}
          event={event}
          author={getPerson(event.authorId)}
          onOpen={() => onEvent(event.id)}
          onProfile={() => onProfile(event.authorId)}
        />
      ))}

      {events.length === 0 && (
        <div className="empty">
          <p>
            {filterMode !== 'all' ? 'No posts match these interests. Choose other interests or clear the filter.' : canCreate
              ? 'No posts yet. Tap the pencil to create one.'
              : 'No announcements yet.'}
          </p>
          {filterMode !== 'all' && <button type="button" className="secondary" onClick={() => { setFilterMode('all'); setSelected([]) }}>Clear filters</button>}
        </div>
      )}
    </>
  )
}