import { useState } from 'react'
import type { FormEvent } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { canReadEvent } from '../services/eventRules'
import { isEnded } from '../utils/format'
import { BackButton } from '../components/BackButton'
import { PhotoPicker } from '../components/PhotoPicker'
import { FormError } from '../components/FormError'
import { Icon } from '../components/Icon'
export function ReviewPage({ eventId, onBack, onPosted }: { eventId: string; onBack: () => void; onPosted: () => void }) {
  const { snapshot, addReview } = useCommunity()
  const [text, setText] = useState(''), [photos, setPhotos] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const event = snapshot.events.find(e => e.id === eventId)
  if (!event || !canReadEvent(event, snapshot.profile) || !isEnded(event)) return <><BackButton onClick={onBack} /><div className="empty"><h2>Reviews are not available.</h2><p>Reviews open after an accessible event ends.</p></div></>
  function submit(e: FormEvent) { e.preventDefault(); if (busy) return; try { addReview(eventId, text, photos); onPosted() } catch (e) { setError(e instanceof Error ? e.message : 'Could not post this review.') } }
  return <><BackButton onClick={onBack}>Back to event</BackButton><span className="eyebrow block">Keep the good moments</span><h1>Add a review</h1><p className="intro">{event.title}</p><form onSubmit={submit}><label className="field">Your experience<textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="What did you enjoy? What could be even better?" /></label><h3>Share photos</h3><PhotoPicker photos={photos} onChange={setPhotos} onBusyChange={setBusy} /><FormError message={error} /><button className="primary" type="submit" disabled={busy}>Post review <Icon name="star" /></button><p className="help">Your review will appear on this event.</p></form></>
}
