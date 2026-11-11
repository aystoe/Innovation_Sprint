import { useState } from 'react'
import { TOPICS } from '../data/config'
import type { Profile } from '../types'
import { BackButton } from '../components/BackButton'
import { FormError } from '../components/FormError'
import { Icon } from '../components/Icon'
export function OnboardingPage({ profile, editing, onBack, onFinish }: { profile: Profile; editing: boolean; onBack: (profile: Profile) => void; onFinish: (profile: Profile) => Promise<void> }) {
  const [topics, setTopics] = useState(profile.topics)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function finish(selected: string[]) {
    if (busy) return
    setBusy(true); setError('')
    try { await onFinish({ ...profile, topics: selected }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Profile could not be saved. Please retry.') }
    finally { setBusy(false) }
  }
  function toggle(topic: string) { setTopics(current => current.includes(topic) ? current.filter(t => t !== topic) : [...current, topic]) }
  return <div className="profile-flow"><BackButton onClick={() => onBack({ ...profile, topics })}>Back to your profile</BackButton><div className="steps" aria-label="Step 2 of 2"><span className="done" /><span className="done" /></div><p className="step-label">Step 2 of 2 · Stay in the loop</p><div className="bell-art"><Icon name="bell" /></div><span className="eyebrow">Your community, your interests</span><h1>What would you like<br />to hear about?</h1><p className="intro">Choose interests for your event filters and notification preferences. You can select more than one.</p>
    <div className="topic-grid" role="group" aria-label="Notification topics">{TOPICS.map(topic => <button key={topic} className={`topic-button ${topics.includes(topic) ? 'selected' : ''}`} type="button" aria-pressed={topics.includes(topic)} onClick={() => toggle(topic)}><span>{topic}</span><span className="topic-mark" aria-hidden="true">{topics.includes(topic) ? '✓' : '+'}</span></button>)}</div>
    <FormError message={error} /><p className="topic-status" aria-live="polite">{topics.length} {topics.length === 1 ? 'topic' : 'topics'} selected</p><button className="primary" type="button" disabled={busy || !topics.length} onClick={() => void finish(topics)}>{editing ? 'Save preferences' : 'Finish registration'} →</button><button className="text-button" type="button" disabled={busy} onClick={() => void finish([])}>Skip notifications for now</button><p className="small-note">You can change these choices from Edit profile at any time.<br />This prototype saves preferences; it does not send notifications.</p>
  </div>
}
