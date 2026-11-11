import { validExternalUrl } from './eventInputRules'
import { isPhoto } from '../utils/avatar'
import { EVENT_TYPES } from '../data/config'
import type { AudienceTrait, CommunityEvent, EventInput, Profile, Role, TraitKind } from '../types'
import { splitTraits } from '../utils/format'

export function profileTraits(profile: Profile, kind: TraitKind): string[] {
  switch (kind) {
    case 'interests': return splitTraits(profile.interests)
    case 'courses': return splitTraits(profile.courses)
    case 'profession': return profile.occupation ? [profile.occupation] : []
    case 'major': return profile.major ? [profile.major] : []
  }
}
/** Any selected trait matches (OR). A creator can always see their own posts. */
export function matchesAudience(event: CommunityEvent, profile: Profile | null): boolean {
  if (event.authorId === profile?.id) return true
  if (event.audience.mode === 'everyone') return true
  if (!profile) return false
  return event.audience.traits.some(trait => profileTraits(profile, trait.kind).some(v => v.toLowerCase().trim() === trait.value.toLowerCase().trim()))
}
export function canReadEvent(
  event: CommunityEvent,
  profile: Profile | null,
  _role?: Role
) {
  void _role // Screen mode is intentionally not an authorization input.
  return matchesAudience(event, profile)
}
export function validateEvent(input: EventInput, role: Role): string | null {
  if (input.capacity != null && (!Number.isSafeInteger(input.capacity) || input.capacity<1 || input.capacity>2147483647)) return 'Capacity must be a positive whole number.'
  if (['external','both'].includes(input.registrationMode ?? '') && !validExternalUrl(input.externalUrl ?? '')) return 'Enter a valid HTTPS registration URL.'
  if (input.externalUrl && !validExternalUrl(input.externalUrl)) return 'External links must use HTTPS.'
  if (input.image && !isPhoto(input.image)) return 'Please choose a valid event photo.'
  if (!Object.hasOwn(EVENT_TYPES, input.type)) return 'Please choose an event type.'
  if (input.type === 'announcement' && role !== 'organizer') return 'Switch to the Organizer screen to publish announcements.'
  if (!input.title.trim() || !input.description.trim() || !input.location.trim() || !Number.isFinite(Date.parse(input.start)) || !Number.isFinite(Date.parse(input.end))) return 'Please complete every required field.'
  if (Date.parse(input.end) <= Date.parse(input.start)) return 'The end time must be after the start time.'
  if (input.title.length > 100 || input.description.length > 3000 || input.location.length > 140) return 'Please keep your text within the field limits.'
  if (input.topics !== undefined && (!Array.isArray(input.topics) || input.topics.length > 30 || input.topics.some(topic => typeof topic !== 'string' || !topic.trim() || topic.length > 100))) return 'Please choose valid interest tags.'
  if (input.audience.mode === 'targeted' && !input.audience.traits.length) return 'Select at least one audience trait, or choose Everyone.'
  return null
}
export function audienceLabel(event: CommunityEvent) {
  const restriction = event.type === 'announcement' ? 'Organizer workspace · ' : ''
  return restriction + (event.audience.mode === 'targeted' ? 'Matching profiles · ' + event.audience.traits.map(t => t.value).join(', ') : 'Everyone in the community')
}
export function availableTraits(profiles: Profile[], topics: string[]): Record<TraitKind, string[]> {
  return {
    interests: [...new Set([...topics, ...profiles.flatMap(p => splitTraits(p.interests))])],
    courses: [...new Set(profiles.flatMap(p => splitTraits(p.courses)))],
    profession: [...new Set(profiles.map(p => p.occupation).filter(Boolean))],
    major: [...new Set(profiles.map(p => p.major).filter(Boolean))],
  }
}
export function sameTrait(a: AudienceTrait, b: AudienceTrait) { return a.kind === b.kind && a.value === b.value }
