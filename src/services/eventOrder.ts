import type { CommunityEvent } from '../types'
/** Sort a copy, oldest start first; ties remain deterministic. */
export function sortEventsByDate(events: CommunityEvent[]): CommunityEvent[] {
  return [...events].sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || a.id.localeCompare(b.id))
}
