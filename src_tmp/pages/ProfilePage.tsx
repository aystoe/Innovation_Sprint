import { useCommunity } from '../context/CommunityContext'
import { BackButton } from '../components/BackButton'
import { photoSource } from '../utils/avatar'
import { splitTraits, isWebUrl } from '../utils/format'
import { ContactPreferencePicker } from '../components/ContactPreferencePicker'
import { getContactOption } from '../data/contactPreferences'
export function ProfilePage({ personId, onBack, onEdit, notify }: { personId: string; onBack: () => void; onEdit: () => void; notify: (message: string) => void }) {
  const { getPerson, saveProfile } = useCommunity()
  const person = getPerson(personId), own = personId === 'me'
  if (!person) return <><BackButton onClick={onBack} /><div className="empty"><h2>No profile yet.</h2><p>Register to introduce yourself to the community.</p><button className="primary" onClick={onEdit}>Register</button></div></>
  const contactOption = getContactOption(person.contactPreference)
  return <><BackButton onClick={onBack}>Back</BackButton>
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

  <p className="contact-status">
    <span
      className={`contact-dot contact-dot--${contactOption.value}`}
      aria-hidden="true"
    />
    {contactOption.description}
  </p>
    <div className="profile-stat"><strong>{new Set(person.attendedEventIds).size}</strong><span>Events joined</span></div>
    <h3>About</h3><p className="profile-bio">{person.bio || 'No introduction added yet.'}</p>
    <h3>Interests</h3><div className="interest-buttons">{splitTraits(person.interests).map(interest => <button type="button" className="interest-button" key={interest} onClick={() => notify(`Interest: ${interest}`)}>{interest}</button>)}{!person.interests.trim() && <p className="empty-profile">No interests added yet.</p>}</div>
    <h3>Which courses have you taken?</h3><div className="course-list">{splitTraits(person.courses).map(course => <span className="course-pill" key={course}>{course}</span>)}{!person.courses.trim() && <p className="empty-profile">No courses added yet.</p>}</div>
    <h3>Major / Field of study</h3><p className="intro">{person.major || 'Not added yet'}</p>
    <div className="profile-links">{[person.social, person.socialOther].filter(isWebUrl).map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer">Social link {i + 1} ↗</a>)}</div>
    {own && (
      <ContactPreferencePicker
        value={contactOption.value}
        onChange={contactPreference => {
          saveProfile({
            ...person,
            contactPreference,
          })

          notify('Contact preference updated.')
        }}
      />
    )}
    {own ? <button type="button" className="primary" onClick={onEdit}>Edit profile & notification preferences</button> : <p className="small-note">Sample community profile</p>}
  </>
}
