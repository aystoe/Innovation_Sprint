import { useState } from 'react'
import type { FormEvent } from 'react'
import type { EventInput, EventType, FeedId, CommunityEvent } from '../types'
import { EVENT_TYPES, FEEDS, TOPICS } from '../data/config'
import { useCommunity } from '../context/CommunityContext'
import { AudiencePicker } from '../components/AudiencePicker'
import { BackButton } from '../components/BackButton'
import { FormError } from '../components/FormError'
import { Icon } from '../components/Icon'
export function CreateEventPage({ feed, onBack, onPublished }: { feed: FeedId; onBack: () => void; onPublished: (event: CommunityEvent) => void }) {
  const { role, publishEvent } = useCommunity()
  const [value, setValue] = useState<EventInput>({ type: feed === 'notices' && role === 'organizer' ? 'announcement' : feed === 'official' ? 'job' : 'alumni', title: '', description: '', location: '', start: '', end: '', topics: [], audience: { mode: 'everyone', traits: [] } })
  const [error, setError] = useState('')
  function submit(e: FormEvent) { e.preventDefault(); try { onPublished(publishEvent(value)) } catch (e) { setError(e instanceof Error ? e.message : 'Could not publish this event.') } }
  return <><BackButton onClick={onBack} /><span className="eyebrow block">Bring people together</span><h1>Create an event</h1><p className="intro">Share an opportunity, plan a meetup or keep your team informed.</p>
    <form onSubmit={submit}>
      <label className="field">Event type<select value={value.type} onChange={e => setValue({ ...value, type: e.target.value as EventType })}>{(Object.keys(EVENT_TYPES) as EventType[]).map(type => <option key={type} value={type} disabled={type === 'announcement' && role !== 'organizer'}>{EVENT_TYPES[type].label}{type === 'announcement' ? ' · Organizers only' : ''}</option>)}</select></label>
      <p className="help">This post will appear in {FEEDS[EVENT_TYPES[value.type].feed].label}.</p>
      <label className="field">Title<input value={value.title} onChange={e => setValue({ ...value, title: e.target.value })} placeholder="Give your event a clear title" maxLength={100} required /></label>
      <label className="field">Description<textarea value={value.description} onChange={e => setValue({ ...value, description: e.target.value })} placeholder="What is it about? Who should join?" maxLength={3000} required /></label>
      <label className="field">Location<input value={value.location} onChange={e => setValue({ ...value, location: e.target.value })} placeholder="Venue, city or online" maxLength={140} required /></label>
      <div className="date-row"><label className="field">Starts / Opens<input type="datetime-local" value={value.start} onChange={e => setValue({ ...value, start: e.target.value })} required /></label><label className="field">Ends / Application deadline<input type="datetime-local" value={value.end} onChange={e => setValue({ ...value, end: e.target.value })} required /></label></div>
      <fieldset className="interest-filter"><legend>Event interests</legend><p className="help">Choose tags to help people find this event.</p><div className="filter-chips">{TOPICS.map(topic => <button type="button" key={topic} className={`interest-button ${value.topics?.includes(topic) ? 'selected' : ''}`} aria-pressed={value.topics?.includes(topic) ?? false} onClick={() => setValue({ ...value, topics: value.topics?.includes(topic) ? value.topics.filter(t => t !== topic) : [...(value.topics ?? []), topic] })}>{topic}</button>)}</div></fieldset>
      <AudiencePicker value={value.audience} onChange={audience => setValue({ ...value, audience })} />
      <div className="photo-placeholder" role="img" aria-label="Empty event photo placeholder"><Icon name="photo" /><strong>You can add a photo here</strong><p>Event photo upload is not available in this prototype.</p></div>
      <FormError message={error} /><button className="primary" type="submit">Publish event <Icon name="pencil" /></button>
    </form>
  </>
}
