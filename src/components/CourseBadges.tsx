import { useId } from 'react'
import type { CSSProperties } from 'react'
import { COURSE_BADGES, CUSTOM_COURSE_BADGE, findBadge, parseCourse } from '../data/courses'
import type { CourseBadgeDef } from '../data/courses'
import { splitTraits } from '../utils/format'

const HEX = '48,8 82.6,28 82.6,68 48,88 13.4,68 13.4,28'
const HEX_INNER = '48,15 76.5,31.5 76.5,64.5 48,81 19.5,64.5 19.5,31.5'

function Medal({ badge }: { badge: CourseBadgeDef }) {
  const id = `m${useId().replace(/\W/g, '')}`
  return <svg className="course-badge__medal" viewBox="0 0 96 96" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--a)" /><stop offset="1" stopColor="var(--b)" /></linearGradient>
    </defs>
    <polygon points={HEX} transform="translate(0 4)" fill="var(--b)" stroke="var(--b)" strokeWidth="8" strokeLinejoin="round" opacity=".45" />
    <polygon points={HEX} fill={`url(#${id})`} stroke="var(--b)" strokeWidth="6" strokeLinejoin="round" />
    <polygon points={HEX_INNER} fill="none" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" opacity=".55" strokeDasharray="2 3" />
    <path d="M20 30 48 14l28 16-4 3-24-13.500L24 33Z" fill="#fff" opacity=".28" />
    <circle cx="23" cy="60" r="1.6" fill="#fff" opacity=".6" /><circle cx="73" cy="60" r="1.6" fill="#fff" opacity=".6" />
    <g className="course-badge__icon" transform="translate(20 21) scale(1.170)">{badge.icon}</g>
  </svg>
}

function Check() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" /></svg>
}

type Item = { badge: CourseBadgeDef; label: string; term: string; on: boolean }

function buildItems(value: string, onlyOn: boolean): Item[] {
  const entries = splitTraits(value)
  const items: Item[] = COURSE_BADGES.map(badge => {
    const hits = entries.filter(e => findBadge(e) === badge)
    return { badge, label: badge.name, term: hits.map(h => parseCourse(h).term).filter(Boolean).map(termLabel).join(' · '), on: hits.length > 0 }
  })
  entries.filter(e => !findBadge(e)).forEach(e => items.push({ badge: CUSTOM_COURSE_BADGE, label: e, term: '', on: true }))
  return onlyOn ? items.filter(i => i.on) : items
}

const shown = (i: Item) => i.badge.short ?? i.label
const courseStyle = { '--a': '#aaa6ff', '--b': '#0600ff' } as CSSProperties

const TERMS = ['26w', '26s', '25w', '25s', '24w', '24s']
const termLabel = (t: string) => `${t.endsWith('w') ? 'Winter' : 'Summer'} 20${t.slice(0, 2)}`

/** Editable multi-select grid. `value` stays the comma-separated course string used by the profile. */
export function CourseBadgePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const entries = splitTraits(value)
  function toggle(item: Item) {
    const isCustom = item.badge === CUSTOM_COURSE_BADGE
    const next = item.on
      ? entries.filter(e => (isCustom ? e !== item.label : findBadge(e) !== item.badge))
      : [...entries, item.badge.name]
    onChange(next.join(', '))
  }
  function setTerm(badge: CourseBadgeDef, term: string) {
    const rest = entries.filter(e => findBadge(e) !== badge)
    onChange([...rest, term ? `${badge.name} ${term}` : badge.name].join(', '))
  }
  return <>
    <div className="course-grid" role="group" aria-label="Which courses have you taken?">
      {buildItems(value, false).map(item => {
        const custom = item.badge === CUSTOM_COURSE_BADGE
        const current = custom ? '' : entries.filter(e => findBadge(e) === item.badge).map(e => parseCourse(e).term).find(Boolean) ?? ''
        const terms = current && !TERMS.includes(current) ? [current, ...TERMS] : TERMS
        return <div className={`course-card${item.on ? ' is-on' : ''}`} key={item.badge.key + item.label} style={courseStyle}>
          <span className="course-badge__check" aria-hidden="true"><Check /></span>
          <button type="button" className={`course-badge${item.on ? ' is-on' : ''}`} aria-pressed={item.on} aria-label={item.label} title={item.label} onClick={() => toggle(item)}>
            <Medal badge={item.badge} />
            <span className="course-badge__name">{shown(item)}</span>
          </button>
          <div className="course-slot">
            {item.on && !custom && <select className="course-select" aria-label={`When did you take ${item.label}?`} value={current} onChange={e => setTerm(item.badge, e.target.value)}>
              <option value="">Semester…</option>
              {terms.map(t => <option key={t} value={t}>{termLabel(t)}</option>)}
            </select>}
          </div>
        </div>
      })}
    </div>
    <p className="help">Tap a badge to collect it, then choose the semester you took it in.</p>
  </>
}

/** Read-only collection shown on a profile: only courses the person has taken. */
export function CourseBadgeList({ value }: { value: string }) {
  const items = buildItems(value, true)
  if (!items.length) return <p className="empty-profile">No courses added yet.</p>
  return <ul className="course-grid course-grid--static">
    {items.map(item => <li key={item.badge.key + item.label} className="course-card is-on" style={courseStyle}>
      <div className="course-badge is-on" title={item.label} aria-label={item.label}>
        <Medal badge={item.badge} />
        <span className="course-badge__name">{shown(item)}</span>
      </div>
      <div className="course-slot">{item.term && <span className="course-badge__term">{item.term}</span>}</div>
    </li>)}
  </ul>
}