import { useEffect, useState } from 'react'
import { useCommunity } from '../context/CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { buildLeaderboard, periodLabel } from '../services/leaderboard'
import { photoSource } from '../utils/avatar'
import { Icon } from '../components/Icon'
import type { RankingPeriod, RankingRole } from '../types'

export function LeaderboardPage({ onProfile }: { onProfile: (id: string) => void }) {
  const { snapshot } = useCommunity()
  const [role, setRole] = useState<RankingRole>('participant')
  const [participantPeriod, setParticipantPeriod] = useState<RankingPeriod>('month')
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const timer = window.setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [])
  const period = role === 'organizer' ? 'semester' : participantPeriod
  const rows = buildLeaderboard([...Object.values(SAMPLE_PROFILES), ...(snapshot.profile ? [snapshot.profile] : [])], snapshot.events, period, now, role)
  const own = rows.find(row => row.profile.id === 'me')
  const range = periodLabel(period, now)
  const action = role === 'organizer' ? 'hosted' : 'attended'
  return <>
    <div className="leaderboard-heading"><span className="trophy-art"><Icon name="trophy" /></span><h1>Leaderboard</h1><p className="intro">Celebrate the people who bring our community together.</p></div>
    <div className="period-switch" role="group" aria-label="Leaderboard role">{(['participant', 'organizer'] as const).map(value => <button key={value} type="button" aria-pressed={role === value} className={role === value ? 'selected' : ''} onClick={() => { setRole(value); setNow(new Date()) }}>{value === 'participant' ? 'Participants' : 'Organizers'}</button>)}</div>
    {role === 'participant' ? <div className="period-switch period-secondary" role="group" aria-label="Participant ranking period">{(['month', 'semester'] as const).map(value => <button type="button" key={value} aria-pressed={participantPeriod === value} className={participantPeriod === value ? 'selected' : ''} onClick={() => { setParticipantPeriod(value); setNow(new Date()) }}>{value === 'month' ? 'Monthly' : 'Per semester'}</button>)}</div> : <p className="semester-label"><Icon name="calendar" />Per semester</p>}
    <div className="section-head"><strong>{range}</strong><span>{rows.length} {role === 'organizer' ? 'organizers' : 'participants'}</span></div>
    <p className="help">Ranked by completed events {action}. Equal counts share a rank.</p>
    {period === 'semester' && <p className="help">Semesters: Apr–Sep and Oct–Mar, in your local time.</p>}
    <div aria-live="polite" aria-atomic="true">
      {snapshot.profile && <p className="your-rank">{own ? `Your rank: #${own.rank} · ${own.count} ${own.count === 1 ? 'event' : 'events'} ${action}` : `No completed events ${action} by you in this period yet.`}</p>}
      {rows.length ? <table className="leaderboard-table"><caption className="visually-hidden">{range}: events {action}</caption><thead><tr><th scope="col">Rank</th><th scope="col">{role === 'organizer' ? 'Organizer' : 'Member'}</th><th scope="col">Events</th></tr></thead><tbody>{rows.map(row => <tr key={row.profile.id} className={row.profile.id === 'me' ? 'own-row' : ''}><td><span className={`rank-number ${row.rank <= 3 ? 'top-rank' : ''}`}>#{row.rank}</span></td><td><button type="button" className="rank-person" onClick={() => onProfile(row.profile.id)}><img src={photoSource(row.profile.photo)} alt="" /><span>{row.profile.name}{row.profile.id === 'me' && <small>You</small>}</span></button></td><td>{row.count}</td></tr>)}</tbody></table> : <div className="empty"><Icon name="trophy" /><h2>A fresh start.</h2><p>No completed events {action} in this period yet.</p></div>}
    </div>
    <p className="small-note">{role === 'organizer' ? 'Host counts use the event organizer.' : 'Attendance is based on saved participation history.'} Includes sample community members.</p>
  </>
}
