import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Profile } from '../types'
import { BackButton } from '../components/BackButton'
import { FormError } from '../components/FormError'
import { PhotoPicker } from '../components/PhotoPicker'
import { photoSource, isPhoto } from '../utils/avatar'
import { isWebUrl } from '../utils/format'
export function RegistrationPage({ initial, editing, onBack, onContinue }: { initial: Profile; editing: boolean; onBack: () => void; onContinue: (profile: Profile) => void }) {
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  function field(key: Exclude<keyof Profile, 'topics' | 'attendedEventIds'>, value: string) { setDraft(d => ({ ...d, [key]: value })) }
  function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const name = draft.name.trim(), social = draft.social.trim(), socialOther = draft.socialOther.trim()
    if (!name) { setError('Please enter your name to continue.'); return }
    if ([social, socialOther].some(value => value && !isWebUrl(value))) { setError('Please enter a full social media URL starting with https:// or http://.'); return }
    onContinue({ ...draft, name, social, socialOther })
  }
  return <div className="profile-flow"><BackButton onClick={onBack}>Back to events</BackButton><div className="steps" aria-label="Step 1 of 2"><span className="done" /><span /></div><p className="step-label">Step 1 of 2 · Your profile</p><span className="eyebrow">A hello goes a long way</span><h1>{editing ? 'Your community profile' : 'Make yourself at home.'}</h1><p className="intro">Start with your name. Add a little more about yourself if you’d like.</p>
    <form onSubmit={submit}>
      <div className="profile-photo-preview"><img src={photoSource(draft.photo)} alt="Your profile photo preview" /><span className="profile-picture-help">Optional profile photo</span></div>
      <PhotoPicker max={1} label="Add profile photo" photos={isPhoto(draft.photo) ? [draft.photo] : []} onChange={photos => field('photo', photos[0] ?? '')} onBusyChange={setBusy} />
      <label className="field">Name <span aria-hidden="true">*</span><input name="name" autoComplete="name" placeholder="Your name" maxLength={80} value={draft.name} onChange={e => field('name', e.target.value)} required aria-required="true" /></label><p className="help">Required. This is the name your community will see.</p>
      <details className="optional-fields" open><summary>More about you <span className="optional-tag">Optional</span></summary><p className="help">Share as much or as little as you like.</p>
        <label className="field">Social media link<input name="social" type="url" inputMode="url" placeholder="https://www.linkedin.com/in/yourname" maxLength={500} value={draft.social} onChange={e => field('social', e.target.value)} /></label>
        <label className="field">Another social media link<input name="socialOther" type="url" inputMode="url" placeholder="https://www.instagram.com/yourname" maxLength={500} value={draft.socialOther} onChange={e => field('socialOther', e.target.value)} /></label>
        <label className="field">Profession<input name="occupation" autoComplete="organization-title" placeholder="e.g. Student, engineer, founder" maxLength={120} value={draft.occupation} onChange={e => field('occupation', e.target.value)} /></label>
        <label className="field">About you<textarea name="bio" placeholder="Tell the community a little about yourself" maxLength={1200} value={draft.bio} onChange={e => field('bio', e.target.value)} /></label>
        <label className="field">Which courses have you taken?<input name="courses" list="course-suggestions" placeholder="e.g. Innovation Sprint 26w, Tech Challenge 25w" maxLength={500} value={draft.courses} onChange={e => field('courses', e.target.value)} /></label>
        <datalist id="course-suggestions">{['Innovation Sprint 26w', 'Innovation Sprint 25w', 'Tech Challenge 26w', 'Manage and More 25s'].map(course => <option key={course} value={course} />)}</datalist><p className="help">Add one or more course names, separated by commas.</p>
        <label className="field">Major / Field of study<input name="major" placeholder="e.g. Computer science" maxLength={120} value={draft.major} onChange={e => field('major', e.target.value)} /></label>
        <label className="field">Interests<textarea name="interests" placeholder="e.g. Robotics, hiking, climate tech" maxLength={600} value={draft.interests} onChange={e => field('interests', e.target.value)} /></label>
      </details>
      <FormError message={error} /><button className="primary" type="submit" disabled={busy}>Continue to notification preferences →</button><p className="small-note">Prototype profile · Saved on this device</p>
    </form>
  </div>
}
