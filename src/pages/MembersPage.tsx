import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { CONTACT_OPTIONS, getContactOption } from '../data/contactPreferences'
import { profileInterests } from '../services/eventInterests'
import { activeMemberFilterCount, emptyMemberFilters, filterMembers, memberOptions } from '../services/memberDirectory'
import type { MemberFilters } from '../services/memberDirectory'
import { photoSource } from '../utils/avatar'
import { splitTraits } from '../utils/format'
import { Icon } from '../components/Icon'

interface Props {
  filters: MemberFilters
  onFiltersChange: (filters: MemberFilters) => void
  onProfile: (id: string) => void
}
export function MembersPage({ filters, onFiltersChange, onProfile }: Props) {
  const { snapshot } = useCommunity()
  const profiles = [...Object.values(SAMPLE_PROFILES), ...(snapshot.profile ? [snapshot.profile] : [])]
  const options = memberOptions(profiles)
  const members = filterMembers(profiles, filters)
  const filterCount = activeMemberFilterCount(filters)
  const hasSearch = !!filters.query.trim() || filterCount > 0
  function update(patch: Partial<MemberFilters>) { onFiltersChange({ ...filters, ...patch }) }
  function toggleInterest(interest: string) {
    update({ interests: filters.interests.includes(interest) ? filters.interests.filter(value => value !== interest) : [...filters.interests, interest] })
  }
  return <>
    <span className="eyebrow block">Find your people</span><h1>Community members</h1><p className="intro">Discover familiar faces and people who share your interests.</p>
    <div className="member-search-panel">
      <label className="member-search-label" htmlFor="member-name">Search by name</label>
      <div className="member-search-input"><Icon name="search" /><input id="member-name" type="search" autoComplete="off" placeholder="Enter a member’s name…" value={filters.query} onChange={e => update({ query: e.target.value })} /></div>
      <details className="member-filters"><summary>Profile filters{filterCount > 0 ? ` (${filterCount})` : ''}</summary>
        <div className="member-filter-grid">
          <label className="field">Profession<select value={filters.occupation} onChange={e => update({ occupation: e.target.value })}><option value="">All professions</option>{options.occupations.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field">Major / Field of study<select value={filters.major} onChange={e => update({ major: e.target.value })}><option value="">All fields</option>{options.majors.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field">Course taken<select value={filters.course} onChange={e => update({ course: e.target.value })}><option value="">All courses</option>{options.courses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="field">Contact preference<select value={filters.contactPreference} onChange={e => update({ contactPreference: e.target.value as MemberFilters['contactPreference'] })}><option value="">All preferences</option>{CONTACT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.title}</option>)}</select></label>
        </div>
        <fieldset className="member-interest-options"><legend>Interests</legend><p className="help">Select one or more. Members matching any selected interest are shown.</p><div className="filter-chips">{options.interests.map(interest => <button key={interest} type="button" className={`interest-button ${filters.interests.includes(interest) ? 'selected' : ''}`} aria-pressed={filters.interests.includes(interest)} onClick={() => toggleInterest(interest)}>{interest}</button>)}</div></fieldset>
        <p className="help">Combine name, profession, field, course and contact preference to narrow your results.</p>
      </details>
      {hasSearch && <button type="button" className="directory-clear" onClick={() => onFiltersChange(emptyMemberFilters())}>Clear search & filters</button>}
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
