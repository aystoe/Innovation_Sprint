import type { CommunityEvent, Profile } from '../types'
import { splitTraits } from '../utils/format'

export const SEED_EVENT_TOPICS: Record<string, string[]> = {
  'social-1': ['Networking', 'Hobby Meetups'],
  'social-2': ['Sports & Outdoors', 'Hobby Meetups'],
  'social-3': ['Party', 'Networking'],
  'official-1': ['Internships', 'Sustainability', 'Entrepreneurship'],
  'official-2': ['Co-founder Search', 'Sustainability', 'Entrepreneurship'],
  'official-3': ['Workshop', 'Entrepreneurship', 'Networking'],
  'notice-1': ['Networking'],
  'notice-2': ['Workshop'],
}
const TYPE_TOPICS: Partial<Record<CommunityEvent['type'], string[]>> = {
  job: ['Internships'], cofounder: ['Co-founder Search'], hobby: ['Hobby Meetups'],
  alumni: ['Networking'], party: ['Party'],
}
export const normalizeInterest = (value: string) => value.trim().toLocaleLowerCase()
export function uniqueInterests(values: string[]): string[] {
  return [...new Map(values.filter(v => v.trim()).map(v => [normalizeInterest(v), v.trim()])).values()]
}
/** Explicit tags take priority; legacy posts retain useful default tags. */
export function eventTopics(event: CommunityEvent): string[] {
  if (event.topics !== undefined) return uniqueInterests(event.topics)
  return uniqueInterests([
    ...(SEED_EVENT_TOPICS[event.id] ?? TYPE_TOPICS[event.type] ?? []),
    ...event.audience.traits.filter(t => t.kind === 'interests').map(t => t.value),
  ])
}
export function profileInterests(profile: Profile | null): string[] {
  return profile ? uniqueInterests([...profile.topics, ...splitTraits(profile.interests)]) : []
}
/** Multiple selected interests are ORed. This never changes audience access. */
export function matchesInterests(event: CommunityEvent, selected: string[]): boolean {
  const tags = new Set(eventTopics(event).map(normalizeInterest))
  return selected.some(topic => tags.has(normalizeInterest(topic)))
}
