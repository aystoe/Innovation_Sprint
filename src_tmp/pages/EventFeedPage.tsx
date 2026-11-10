import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { FEEDS, EVENT_TYPES } from '../data/config'
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

  const events = snapshot.events.filter(
    event =>
      EVENT_TYPES[event.type].feed === feed &&
      canReadEvent(event, snapshot.profile)
  )

  const canCreate =
    feed !== 'notices' || role === 'organizer'

  return (
    <>
      <div className="section-head">
        <strong>{FEEDS[feed].label}</strong>
        <span>{events.length} posts · Latest first</span>
      </div>

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
            {canCreate
              ? 'No posts yet. Tap the pencil to create one.'
              : 'No announcements yet.'}
          </p>
        </div>
      )}
    </>
  )
}