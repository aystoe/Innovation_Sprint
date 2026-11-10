import type { CommunityEvent, Profile, RankingPeriod, RankingRole } from '../types'

/** Academic semesters: April–September and October–March, local calendar time. */
export function periodStart(period: RankingPeriod, now: Date): Date {
  const year = now.getFullYear(), month = now.getMonth()
  if (period === 'month') return new Date(year, month, 1)
  return month >= 9 ? new Date(year, 9, 1) : month >= 3 ? new Date(year, 3, 1) : new Date(year - 1, 9, 1)
}
export function periodLabel(period: RankingPeriod, now: Date): string {
  if (period === 'month') return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const start = periodStart(period, now), year = start.getFullYear()
  return start.getMonth() === 3 ? `Apr – Sep ${year}` : `Oct ${year} – Mar ${year + 1}`
}
export interface LeaderboardEntry { profile: Profile; count: number; rank: number }
/** Only completed events count, using their end date; hosts are identified by authorId. */
export function buildLeaderboard(profiles: Profile[], events: CommunityEvent[], period: RankingPeriod, now = new Date(), role: RankingRole = 'participant'): LeaderboardEntry[] {
  const start = periodStart(period, now).getTime()
  const eligible = new Map(events.filter(event => {
    const end = Date.parse(event.end)
    return ['official', 'hobby', 'alumni', 'party'].includes(event.type) && end >= start && end <= now.getTime()
  }).map(event => [event.id, event]))
  const rows = [...new Map(profiles.map(profile => [profile.id, profile])).values()]
    .map(profile => ({ profile, count: role === 'organizer'
      ? [...eligible.values()].filter(event => event.authorId === profile.id).length
      : [...new Set(profile.attendedEventIds)].filter(id => eligible.has(id)).length, rank: 0 }))
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count || a.profile.name.localeCompare(b.profile.name) || a.profile.id.localeCompare(b.profile.id))
  rows.forEach((row, index) => { row.rank = index > 0 && rows[index - 1].count === row.count ? rows[index - 1].rank : index + 1 })
  return rows
}
