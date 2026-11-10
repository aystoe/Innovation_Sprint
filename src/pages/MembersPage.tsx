import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { CONTACT_OPTIONS, getContactOption } from '../data/contactPreferences'
import { profileInterests } from '../services/eventInterests'
import { emptyMemberFilters, filterMembers, memberOptions } from '../services/memberDirectory'
import type { MemberFilters } from '../services/memberDirectory'
import { photoSource } from '../utils/avatar'
import { splitTraits } from '../utils/format'
import { FilterPanel } from '../components/FilterPanel'
import { InterestPicker } from '../components/InterestPicker'
import { Icon } from '../components/Icon'
import { TEAM_PROFILES } from '../data/teamProfiles'

interface Props {
  filters: MemberFilters
  onFiltersChange: (filters: MemberFilters) => void
  onProfile: (id: string) => void
}
export function MembersPage({ filters, onFiltersChange, onProfile }: Props) {
  const { snapshot } = useCommunity()
  const profiles = [...Object.values(SAMPLE_PROFILES), ...(snapshot.profile ? [snapshot.profile] : [])]
  const options = memberOptions(profiles)
  const teamOrder = new Map(
    TEAM_PROFILES.map((person, index) => [person.id, index])
  )

  const members = filterMembers(profiles, filters).sort(
    (a, b) =>
      (teamOrder.get(a.id) ?? TEAM_PROFILES.length) -
      (teamOrder.get(b.id) ?? TEAM_PROFILES.length)
  )
  function update(patch: Partial<MemberFilters>) { onFiltersChange({ ...filters, ...patch }) }
  function toggleInterest(interest: string) {
    update({ interests: filters.interests.includes(interest) ? filters.interests.filter(value => value !== interest) : [...filters.interests, interest] })
  }
  const active = [
    ...(filters.occupation ? [{ id: 'occupation', label: `Profession: ${filters.occupation}`, onRemove: () => update({ occupation: '' }) }] : []),
    ...(filters.major ? [{ id: 'major', label: `Field: ${filters.major}`, onRemove: () => update({ major: '' }) }] : []),
    ...(filters.course ? [{ id: 'course', label: `Course: ${filters.course}`, onRemove: () => update({ course: '' }) }] : []),
    ...(filters.contactPreference ? [{ id: 'contact', label: getContactOption(filters.contactPreference).title, onRemove: () => update({ contactPreference: '' }) }] : []),
    ...filters.interests.map(interest => ({ id: `interest:${interest}`, label: interest, onRemove: () => toggleInterest(interest) })),
  ]
  return <>
    <span className="eyebrow block">Find your people</span><h1>Community members</h1><p className="intro">Discover familiar faces and people who share your interests.</p>
    <div className="member-search-panel">
      <label className="member-search-label" htmlFor="member-name">Search by name</label>
      <div className="member-search-input"><Icon name="search" /><input id="member-name" type="search" autoComplete="off" placeholder="Enter a member’s name…" value={filters.query} onChange={e => update({ query: e.target.value })} /></div>
      {filters.query && <button className="clear-name" type="button" onClick={() => update({ query: '' })}>Clear name</button>}
      <FilterPanel label="Profile filters" active={active} onClear={() => onFiltersChange({ ...emptyMemberFilters(), query: filters.query })}>
        <p className="filter-instruction">Find people by profession, field, course or interests. Results update as you choose.</p>
        <div className="member-filter-grid">
          <label className="field">Profession<select value={filters.occupation} onChange={e => update({ occupation: e.target.value })}><option value="">All professions</option>{options.occupations.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field">Major / Field of study<select value={filters.major} onChange={e => update({ major: e.target.value })}><option value="">All fields</option>{options.majors.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field">Course taken<select value={filters.course} onChange={e => update({ course: e.target.value })}><option value="">All courses</option>{options.courses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field">Contact preference<select value={filters.contactPreference} onChange={e => update({ contactPreference: e.target.value as MemberFilters['contactPreference'] })}><option value="">All preferences</option>{CONTACT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.title}</option>)}</select></label>
        </div>
        <fieldset className="member-interest-options"><legend>Interests</legend><p className="help">Match any selected interest.</p><InterestPicker options={options.interests} selected={filters.interests} onToggle={toggleInterest} /></fieldset>
      </FilterPanel>
    </div>
    <div className="section-head"><strong>Member directory</strong><span role="status" aria-live="polite">{members.length} of {profiles.length} members</span></div>
    {members.length ? <ul className="member-list" aria-label="Community members">{members.map(person => {
      const contact = getContactOption(person.contactPreference)
      const interests = profileInterests(person)
      const courses = splitTraits(person.courses)
      return <li key={person.id}><button className="member-card" type="button" onClick={() => onProfile(person.id)} aria-label={`View ${person.name}'s profile`}>
        <span className="member-card-head"><img className="member-avatar" src={photoSource(person.photo)} alt="" /><span className="member-identity"><strong>{person.name}{person.id === 'me' && <small className="member-you">You</small>}</strong><span>{person.occupation || 'Community member'}</span></span><span className={`contact-dot contact-dot--${contact.value}`} role="img" aria-label={contact.description} title={contact.description} /></span>
        {person.major && <span className="member-major">{person.major}</span>}
        {person.bio && <span className="member-bio">{person.bio}</span>}
        {!!interests.length && <span className="member-card-tags">{interests.slice(0, 3).map(interest => <span key={interest}>{interest}</span>)}{interests.length > 3 && <span>+{interests.length - 3}</span>}</span>}
        {!!courses.length && <span className="member-course">Courses: {courses.join(' · ')}</span>}
        <span className="member-card-foot"><span>{person.id === 'me' ? 'Your profile' : 'Demo member'}</span><span>View profile →</span></span>
      </button></li>
    })}</ul> : <div className="empty"><Icon name="search" /><h2>No members found</h2><p>Try a different name or remove a filter.</p><button type="button" className="secondary" onClick={() => onFiltersChange(emptyMemberFilters())}>Show all members</button></div>}
    <p className="small-note">50 fictional demo profiles{snapshot.profile ? ' and your saved profile' : ''}. Your profile appears here after registration.</p>
  </>
}
