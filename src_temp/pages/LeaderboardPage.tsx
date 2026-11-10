import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { buildLeaderboard, periodStart } from '../services/leaderboard'
import { photoSource } from '../utils/avatar'
import { Icon } from '../components/Icon'
import type { RankingPeriod } from '../types'

const PERIODS: { id: RankingPeriod; label: string }[] = [
  { id: 'day', label: 'Daily' }, { id: 'month', label: 'Monthly' }, { id: 'year', label: 'Yearly' },
]
export function LeaderboardPage({ onProfile }: { onProfile: (id: string) => void }) {
  const { snapshot } = useCommunity()
  const [period, setPeriod] = useState<RankingPeriod>('month')
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const timer = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [])
  const rows = buildLeaderboard([...Object.values(SAMPLE_PROFILES), ...(snapshot.profile ? [snapshot.profile] : [])], snapshot.events, period, now)
  const own = rows.find(row => row.profile.id === 'me')
  const range = period === 'day'
    ? now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : period === 'month' ? now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : String(now.getFullYear())
  return <>
    <div className="leaderboard-heading"><span className="trophy-art"><Icon name="trophy" /></span><span className="eyebrow">Every shared moment counts</span><h1>Community leaderboard</h1><p className="intro">Celebrate the people who keep showing up.</p></div>
    <div className="period-switch" role="group" aria-label="Leaderboard period">{PERIODS.map(item => <button key={item.id} type="button" aria-pressed={period === item.id} className={period === item.id ? 'selected' : ''} onClick={() => { setPeriod(item.id); setNow(new Date()) }}>{item.label}</button>)}</div>
    <div className="section-head"><strong>{range}</strong><span>{rows.length} participants</span></div>
    <p className="help">Completed events since {periodStart(period, now).toLocaleDateString('en-GB')}, in your local time. Future events do not count. Equal counts share a rank.</p>
    <div aria-live="polite" aria-atomic="true">
      {snapshot.profile && <p className="your-rank">{own ? `Your rank: #${own.rank} · ${own.count} ${own.count === 1 ? 'event' : 'events'}` : 'No completed events for you in this period yet.'}</p>}
      {rows.length ? <table className="leaderboard-table"><caption className="visually-hidden">{range} event participation rankings</caption><thead><tr><th scope="col">Rank</th><th scope="col">Member</th><th scope="col">Events</th></tr></thead><tbody>{rows.map(row => <tr key={row.profile.id} className={row.profile.id === 'me' ? 'own-row' : ''}><td><span className={`rank-number ${row.rank <= 3 ? 'top-rank' : ''}`}>#{row.rank}</span></td><td><button type="button" className="rank-person" onClick={() => onProfile(row.profile.id)}><img src={photoSource(row.profile.photo)} alt="" /><span>{row.profile.name}{row.profile.id === 'me' && <small>You</small>}</span></button></td><td>{row.count}</td></tr>)}</tbody></table> : <div className="empty"><Icon name="trophy" /><h2>A fresh start.</h2><p>No completed event participation in this period yet. Try another period or mark an ended event as attended.</p></div>}
    </div>
    <p className="small-note">Based on saved participation history, including sample community members. Participation is self-reported in this demo.</p>
  </>
}
