import { useState } from 'react'
import { TOPICS } from '../data/config'
import type { Profile } from '../types'
import { BackButton } from '../components/BackButton'
import { Icon } from '../components/Icon'
export function OnboardingPage({ profile, editing, onBack, onFinish }: { profile: Profile; editing: boolean; onBack: (profile: Profile) => void; onFinish: (profile: Profile) => void }) {
  const [topics, setTopics] = useState(profile.topics)
  function toggle(topic: string) { setTopics(current => current.includes(topic) ? current.filter(t => t !== topic) : [...current, topic]) }
  return <div className="profile-flow"><BackButton onClick={() => onBack({ ...profile, topics })}>Back to your profile</BackButton><div className="steps" aria-label="Step 2 of 2"><span className="done" /><span className="done" /></div><p className="step-label">Step 2 of 2 · Stay in the loop</p><div className="bell-art"><Icon name="bell" /></div><span className="eyebrow">Your community, your interests</span><h1>What would you like<br />to hear about?</h1><p className="intro">Choose the areas you’d like to receive notifications about. You can select more than one.</p>
    <div className="topic-grid" role="group" aria-label="Notification topics">{TOPICS.map(topic => <button key={topic} className={`topic-button ${topics.includes(topic) ? 'selected' : ''}`} type="button" aria-pressed={topics.includes(topic)} onClick={() => toggle(topic)}><span>{topic}</span><span className="topic-mark" aria-hidden="true">{topics.includes(topic) ? '✓' : '+'}</span></button>)}</div>
    <p className="topic-status" aria-live="polite">{topics.length} {topics.length === 1 ? 'topic' : 'topics'} selected</p><button className="primary" type="button" disabled={!topics.length} onClick={() => onFinish({ ...profile, topics })}>{editing ? 'Save preferences' : 'Finish registration'} →</button><button className="text-button" type="button" onClick={() => onFinish({ ...profile, topics: [] })}>Skip notifications for now</button><p className="small-note">You can change these choices from Edit profile at any time.<br />This prototype saves preferences; it does not send notifications.</p>
  </div>
}
