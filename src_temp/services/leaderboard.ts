import type { CommunityEvent, Profile, RankingPeriod } from '../types'

export function periodStart(period: RankingPeriod, now: Date): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (period !== 'day') start.setDate(1)
  if (period === 'year') start.setMonth(0)
  return start
}
export interface LeaderboardEntry { profile: Profile; count: number; rank: number }
/** Local calendar periods; an event counts once, on its end date, after ending. */
export function buildLeaderboard(profiles: Profile[], events: CommunityEvent[], period: RankingPeriod, now = new Date()): LeaderboardEntry[] {
  const start = periodStart(period, now).getTime()
  const eligible = new Set(events.filter(event => {
    const end = Date.parse(event.end)
    return ['official', 'hobby', 'alumni', 'party'].includes(event.type) && end >= start && end <= now.getTime()
  }).map(event => event.id))
  const rows = [...new Map(profiles.map(profile => [profile.id, profile])).values()]
    .map(profile => ({ profile, count: [...new Set(profile.attendedEventIds)].filter(id => eligible.has(id)).length, rank: 0 }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count || a.profile.name.localeCompare(b.profile.name) || a.profile.id.localeCompare(b.profile.id))
  rows.forEach((row, index) => { row.rank = index > 0 && rows[index - 1].count === row.count ? rows[index - 1].rank : index + 1 })
  return rows
}
