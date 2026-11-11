import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Profile } from '../types'
import { BackButton } from '../components/BackButton'
import { FormError } from '../components/FormError'
import { PhotoPicker } from '../components/PhotoPicker'
import { photoSource, isPhoto } from '../utils/avatar'
import { ContactPreferencePicker } from '../components/ContactPreferencePicker'
import { getContactOption } from '../data/contactPreferences'
import { CourseBadgePicker } from '../components/CourseBadges'
import { CONTRIBUTIONS } from '../services/organizer'
import { isWebUrl } from '../utils/format'
const PROFESSIONS = ['Student',  'Alumni',  'Founder',  'Educator',  'Organizer',]
export function RegistrationPage({ initial, onBack, onContinue, firstSetup = false }: { initial: Profile; editing: boolean; firstSetup?: boolean; onBack: () => void; onContinue: (profile: Profile) => void }) {
  const [draft, setDraft] = useState(() => ({...initial, occupation: PROFESSIONS.includes(initial.occupation) ? initial.occupation : '', }))
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  function field(key: Exclude<keyof Profile, 'topics' | 'attendedEventIds' | 'openTo'>, value: string) { setDraft(d => ({ ...d, [key]: value })) }
  function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const name = draft.name.trim(), social = draft.social.trim(), socialOther = draft.socialOther.trim()
    if (!name) { setError('Please enter your name to continue.'); return }
    if ([social, socialOther].some(value => value && !isWebUrl(value))) { setError('Please enter a full social media URL starting with https://, http:// or email.'); return }
    onContinue({ ...draft, name, social, socialOther })
  }
  return <div className="profile-flow">{!firstSetup && <BackButton onClick={onBack}>Back to events</BackButton>}<div className="steps" aria-label="Step 1 of 2"><span className="done" /><span /></div><p className="step-label">Step 1 of 2 · Your profile</p>
    <form onSubmit={submit}>
      <div className="profile-photo-preview"><img src={photoSource(draft.photo)} alt="Your profile photo preview" /><span className="profile-picture-help">Optional profile photo</span></div>
      <PhotoPicker max={1} label="Add profile photo" photos={isPhoto(draft.photo) ? [draft.photo] : []} onChange={photos => setDraft(current => ({...current,photo:photos[0] ?? '',photoPath:photos.length ? current.photoPath : undefined,photoUnavailable:false}))} onBusyChange={setBusy} />
      {draft.photoUnavailable && <p role="status" className="help">Your saved photo could not be loaded. You can upload a replacement or <button type="button" className="text-button" onClick={() => setDraft(current => ({...current,photo:'',photoPath:undefined,photoUnavailable:false}))}>remove the saved photo</button>.</p>}
      <label className="field">Name <span aria-hidden="true">*</span><input name="name" autoComplete="name" placeholder="Your name" maxLength={80} value={draft.name} onChange={e => field('name', e.target.value)} required aria-required="true" /></label><p className="help">Required. This is the name your community will see.</p>
      <label className="field">Profession<select name="occupation" value={draft.occupation} onChange={e => field('occupation', e.target.value)} >    <option value="">Select your profession</option> {PROFESSIONS.map(profession => ( <option key={profession} value={profession}> {profession} </option>))} </select> </label> 
      <fieldset className="member-interest-options"><legend>Open to</legend><div className="filter-chips">{CONTRIBUTIONS.map(type => <button type="button" className={`interest-button ${draft.openTo?.includes(type) ? 'selected' : ''}`} aria-pressed={draft.openTo?.includes(type) ?? false} key={type} onClick={() => setDraft(current => ({ ...current, openTo: current.openTo?.includes(type) ? current.openTo.filter(item => item !== type) : [...(current.openTo ?? []), type] }))}>{type}</button>)}</div></fieldset>
      <ContactPreferencePicker
        value={getContactOption(draft.contactPreference).value}
        onChange={contactPreference => {
          setDraft(current => ({
            ...current,
            contactPreference,
          }))
        }}
      />
      <details className="optional-fields" open><summary>More about you <span className="optional-tag">Optional</span></summary><p className="help">Share as much or as little as you like.</p>
        <div className="field"><span>Which courses have you taken?</span><CourseBadgePicker value={draft.courses} onChange={courses => field('courses', courses)} /></div>
        <datalist id="course-suggestions">  {[    'Innovation Sprint 26w',    'Innovation Sprint 25w',    'Tech Challenge 26w',    'Manage and More 25s',  ].map(course => (    <option key={course} value={course} />  ))} </datalist>
        <label className="field">Social media link<input name="social" type="url" inputMode="url" placeholder="https://www.linkedin.com/in/yourname" maxLength={500} value={draft.social} onChange={e => field('social', e.target.value)} /></label>
        <label className="field">Another social media link<input name="socialOther" type="url" inputMode="url" placeholder="https://www.instagram.com/yourname" maxLength={500} value={draft.socialOther} onChange={e => field('socialOther', e.target.value)} /></label>
        <label className="field">About you<textarea name="bio" placeholder="Tell the community a little about yourself" maxLength={1200} value={draft.bio} onChange={e => field('bio', e.target.value)} /></label> 
        <label className="field">Major / Field of study<input name="major" placeholder="e.g. Computer science" maxLength={120} value={draft.major} onChange={e => field('major', e.target.value)} /></label>
        <label className="field">Interests<textarea name="interests" placeholder="e.g. Robotics, hiking, climate tech" maxLength={600} value={draft.interests} onChange={e => field('interests', e.target.value)} /></label>
      </details>
      <FormError message={error} /><button className="primary" type="submit" disabled={busy}>Continue to notification preferences →</button><p className="small-note">Your profile is saved to your Common Ground account.</p>
    </form>
  </div>
}
