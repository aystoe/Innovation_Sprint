import type { Profile, ContactPreference } from '../types'
import { profileInterests } from './eventInterests'
import { splitTraits } from '../utils/format'

export interface MemberFilters {
  query: string
  occupation: string
  major: string
  course: string
  interests: string[]
  contactPreference: ContactPreference | ''
}
export const emptyMemberFilters = (): MemberFilters => ({ query: '', occupation: '', major: '', course: '', interests: [], contactPreference: '' })
/** Ignore case, accents and repeated spaces; keep non-Latin names intact. */
export const normalizeMemberText = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase()
const same = (a: string, b: string) => normalizeMemberText(a) === normalizeMemberText(b)
function uniqueOptions(values: string[]) {
  const result = new Map<string, string>()
  for (const value of values) if (value.trim() && !result.has(normalizeMemberText(value))) result.set(normalizeMemberText(value), value.trim())
  return [...result.values()].sort((a, b) => a.localeCompare(b))
}
export function memberOptions(profiles: Profile[]) {
  return {
    occupations: uniqueOptions(profiles.map(p => p.occupation)),
    majors: uniqueOptions(profiles.map(p => p.major)),
    courses: uniqueOptions(profiles.flatMap(p => splitTraits(p.courses))),
    interests: uniqueOptions(profiles.flatMap(profileInterests)),
  }
}
/** Different attributes are ANDed; selected interests match any (OR). */
export function filterMembers(profiles: Profile[], filters: MemberFilters): Profile[] {
  const words = normalizeMemberText(filters.query).split(' ').filter(Boolean)
  return [...new Map(profiles.map(p => [p.id, p])).values()].filter(profile => {
    const name = normalizeMemberText(profile.name)
    return words.every(word => name.includes(word))
      && (!filters.occupation || same(profile.occupation, filters.occupation))
      && (!filters.major || same(profile.major, filters.major))
      && (!filters.course || splitTraits(profile.courses).some(course => same(course, filters.course)))
      && (!filters.interests.length || profileInterests(profile).some(interest => filters.interests.some(selected => same(interest, selected))))
      && (!filters.contactPreference || (profile.contactPreference ?? 'gray') === filters.contactPreference)
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}
export function activeMemberFilterCount(filters: MemberFilters) {
  return [filters.occupation, filters.major, filters.course, filters.contactPreference].filter(Boolean).length + filters.interests.length
}
