import { useEffect, useState } from 'react'
import { loadProfile } from '../services/profileRepository'
import type { Profile } from '../types'
import { useCommunity } from '../context/CommunityContext'
import { BackButton } from '../components/BackButton'
import { photoSource } from '../utils/avatar'
import { splitTraits, isWebUrl } from '../utils/format'
import { CourseBadgeList } from '../components/CourseBadges'
import { ContactPreferencePicker } from '../components/ContactPreferencePicker'
import { openTo } from '../services/organizer'
import { getContactOption } from '../data/contactPreferences'
export function ProfilePage({ personId, onBack, onEdit, notify }: { personId: string; onBack: () => void; onEdit: () => void; notify: (message: string) => void }) {
  const { userId, snapshot, saveProfile } = useCommunity()
  const own = personId===userId
  const [attempt,setAttempt] = useState(0)
  const [loaded,setLoaded] = useState<{id:string;profile:Profile|null;error:string}>({id:'',profile:null,error:''})
  useEffect(() => {
    if(own)return
    const controller=new AbortController()
    loadProfile(personId,controller.signal).then(profile => {
      if(!controller.signal.aborted)setLoaded({id:personId,profile,error:''})
    }).catch(cause => {if(!controller.signal.aborted)setLoaded({id:personId,profile:null,error:cause?.message ?? 'Could not load this profile.'})})
    return () => controller.abort()
  },[personId,own,attempt])
  const person = own ? snapshot.profile : loaded.id===personId ? loaded.profile : null
  if(!own && loaded.id!==personId)return <><BackButton sticky onClick={onBack} /><p role="status">Loading profile…</p></>
  if(!own && loaded.error)return <><BackButton sticky onClick={onBack} /><div className="empty" role="alert"><p>{loaded.error}</p><button type="button" className="secondary" onClick={() => {setLoaded({id:'',profile:null,error:''});setAttempt(n=>n+1)}}>Retry</button></div></>
  if (!person) return <><BackButton sticky onClick={onBack} /><div className="empty"><h2>Profile unavailable</h2><p>This account has no published profile.</p></div></>
  const contactOption = getContactOption(person.contactPreference)
  return <><BackButton sticky onClick={onBack}>Back</BackButton>
  <h1>{person.name}</h1><p className="profile-profession">{person.occupation || 'Community member'}</p>
  <div className="profile-photo-wrapper">
    <img
      className="profile-photo"
      src={photoSource(person.photo)}
      alt={`Profile photo of ${person.name}`}
    />

    <span
      className={`profile-contact-light contact-dot--${contactOption.value}`}
      role="img"
      aria-label={contactOption.description}
      title={contactOption.description}
    />
  </div>

  {person.photoUnavailable && <p className="help" role="status">Profile photo is currently unavailable.</p>}
  <p className="contact-status">
    <span
      className={`contact-dot contact-dot--${contactOption.value}`}
      aria-hidden="true"
    />
    {contactOption.description}
  </p>
    <div className="profile-stat"><strong>—</strong><span>Attendance history is private</span></div>
    <h3>Open to</h3><div className="filter-chips">{openTo(person).map(type=><span key={type} className="tag">{type}</span>)}{!openTo(person).length && <p className="help">Not open to requests right now.</p>}</div>
    <h3>About</h3><p className="profile-bio">{person.bio || 'No introduction added yet.'}</p>
    <h3>Interests</h3><div className="interest-buttons">{splitTraits(person.interests).map(interest => <button type="button" className="interest-button" key={interest} onClick={() => notify(`Interest: ${interest}`)}>{interest}</button>)}{!person.interests.trim() && <p className="empty-profile">No interests added yet.</p>}</div>
    <h3>Which courses have you taken?</h3><CourseBadgeList value={person.courses} />
    <h3>Major / Field of study</h3><p className="intro">{person.major || 'Not added yet'}</p>
    <div className="profile-links">{[person.social, person.socialOther].filter(isWebUrl).map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer">Social link {i + 1} ↗</a>)}</div>
    {own && (
      <ContactPreferencePicker
        value={contactOption.value}
        onChange={async contactPreference => {
          try {
          await saveProfile({
            ...person,
            contactPreference,
          })

          notify('Contact preference updated.')
          } catch (cause) { notify(cause instanceof Error ? cause.message : 'Profile could not be saved.') }
        }}
      />
    )}
    {own ? <button type="button" className="primary" onClick={onEdit}>Edit profile & notification preferences</button> : <p className="small-note">Community profile</p>}
  </>
}
