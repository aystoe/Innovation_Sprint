import type { ReactNode } from 'react'

/** A course badge: unique 48×48 line icon plus a two-tone accent (light → deep). */
export type CourseBadgeDef = { key: string; name: string; short?: string; light: string; deep: string; icon: ReactNode }

export const CUSTOM_COURSE_BADGE: CourseBadgeDef = {
  key: 'custom', name: '', light: '#b3a8c9', deep: '#6d5f8c',
  icon: <><circle cx="24" cy="19" r="9" /><path d="M18 27l-4 13 10-5 10 5-4-13" /><path d="m24 14 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5Z" className="soft" /></>,
}

export const COURSE_BADGES: CourseBadgeDef[] = [
  { key: 'opportunity-hunters', name: 'Opportunity Hunters', light: '#f0a38a', deep: '#c4553a',
    icon: <><circle cx="24" cy="24" r="14" /><circle cx="24" cy="24" r="7.5" /><path d="M24 24 35 13" /><circle cx="24" cy="24" r="2" className="solid" /><circle cx="35" cy="13" r="2.4" className="solid" /></> },
  { key: 'innovation-sprint', name: 'Innovation Sprint', light: '#f6cf62', deep: '#d18a12',
    icon: <><path d="M28 7 13 27h10l-3 14 15-21H25l3-13Z" className="soft" /><path d="M6 20h5M5 28h6M37 34h5" /></> },
  { key: 'startup-launchpad', name: 'Startup Launchpad', light: '#f48fa4', deep: '#c93d63',
    icon: <><path d="M24 6c6 4 8 12 6 20l-6 5-6-5c-2-8 0-16 6-20Z" className="soft" /><circle cx="24" cy="17" r="2.8" /><path d="M18 26l-5 5 1-7 4-3M30 26l5 5-1-7-4-3M21 36l3 6 3-6" /></> },
  { key: 'principled-entrepreneurial-decisions', name: 'Principled Entrepreneurial Decisions', light: '#6fc3b4', deep: '#237b6d',
    icon: <><circle cx="24" cy="24" r="15" /><path d="M31 17l-5 10-9 4 5-10 9-4Z" className="soft" /><path d="M24 6v4M24 38v4M6 24h4M38 24h4" /><circle cx="24" cy="24" r="1.6" className="solid" /></> },
  { key: 'venture-guide', name: 'Venture Guide', light: '#8fb4e8', deep: '#3a68b0',
    icon: <><path d="M24 7v35M17 42h14" /><path d="M24 12h13l4 4.5-4 4.5H24Z" className="soft" /><path d="M24 25H11l-4 4.5 4 4.5h13" /></> },
  { key: 'venture-exploration', name: 'Venture Exploration', light: '#a392e6', deep: '#5b45b3',
    icon: <><path d="m9 24 24-9 3.5 9-24 9L9 24Z" className="soft" /><path d="m33 15 3.5 9M24 31l-6 11M24 31l6 11" /><path d="M40 6v6M37 9h6" /></> },
  { key: 'innovative-entrepreneurs', name: 'Innovative Entrepreneurs', light: '#f7d65c', deep: '#cf9a0a',
    icon: <><path d="M24 8a11 11 0 0 0-6 20c1.2 1 2 3 2 5h8c0-2 .8-4 2-5A11 11 0 0 0 24 8Z" className="soft" /><path d="M20.5 37h7M21.5 41h5M24 17v10" /><path d="M7 18h4M37 18h4M11 7l3 3M37 7l-3 3" /></> },
  { key: 'business-design-deep-dive', name: 'Business Design Deep Dive', light: '#7fd0e0', deep: '#2a8196',
    icon: <><path d="m24 8 16 7.5-16 7.5-16-7.500Z" className="soft" /><path d="m8 24 16 7.500L40 24M8 32.5 24 40l16-7.5" /></> },
  { key: 'agile-team-lead', name: 'Agile Team Lead', light: '#9bd18a', deep: '#4a8f3b',
    icon: <><path d="M22 17l-6.5 11M26 17l6.5 11M18 35h12" /><circle cx="24" cy="13" r="5" className="soft" /><circle cx="13" cy="34" r="5" className="soft" /><circle cx="35" cy="34" r="5" className="soft" /></> },
  { key: 'leadership-talent-academy', name: 'Leadership Talent Academy', light: '#f2b665', deep: '#c0711b',
    icon: <><path d="m24 7 5 10 11 1.6-8 7.8 1.9 11L24 32l-9.9 5.4 1.9-11-8-7.800L19 17l5-10Z" className="soft" /><path d="m18 44 6-4 6 4" /></> },
  { key: 'manage-and-more', name: 'Manage and More', light: '#86c97a', deep: '#3b8a4a',
    icon: <><circle cx="17" cy="20" r="7" className="soft" /><circle cx="31" cy="20" r="7" className="soft" /><circle cx="24" cy="13" r="7.5" className="soft" /><path d="M24 42V26M17 33l7-5M31 31l-7-5M15 42h18" /></> },
  { key: 'executive-mba', name: 'Executive MBA in Innovation & Business Creation', short: 'Exec. MBA Innovation & Business Creation', light: '#b49ae0', deep: '#6a47a8',
    icon: <><path d="m24 6 15 8.500v19L24 42l-15-8.500v-19L24 6Z" /><path d="m24 15 8.5 15h-17L24 15Z" className="soft" /><path d="M24 15v15M15.5 30 24 38l8.5-8" /></> },
  { key: 'innoenergy-journey', name: 'InnoEnergy Entrepreneurship Journey', light: '#f59a6b', deep: '#cc4e1c',
    icon: <><circle cx="24" cy="24" r="17" /><path d="M9 26h8l3.5-9 5 15 3.5-8H39" className="pulse" /></> },
  { key: 'eit-um-dtn', name: 'EIT Urban Mobility Doctoral Training Network', short: 'EIT UM Doctoral Training Network', light: '#74b8e6', deep: '#2b6fa6',
    icon: <><path d="M10 41V25h8v16M18 41V15h10v26M28 41V23h10v18M6 41h36" className="soft" /><path d="M14 17l9-8 11 6" /><circle cx="14" cy="17" r="2.5" className="solid" /><circle cx="23" cy="9" r="2.5" className="solid" /><circle cx="34" cy="15" r="2.5" className="solid" /></> },
  { key: 'tech-challenge', name: 'Tech Challenge', light: '#8ea7c4', deep: '#44607f',
    icon: <><rect x="14" y="14" width="20" height="20" rx="4" className="soft" /><rect x="20" y="20" width="8" height="8" rx="1.5" /><path d="M19 8v6M29 8v6M19 34v6M29 34v6M8 19h6M8 29h6M34 19h6M34 29h6" /></> },
]

/** "Innovation Sprint 26w" → { base: "innovation sprint", term: "26w" } */
export function parseCourse(entry: string) {
  const match = entry.trim().match(/^(.*?)\s+(\d{2}\s?[ws])$/i)
  const base = (match ? match[1] : entry).trim()
  return { base: base.toLowerCase(), term: match ? match[2].replace(/\s/g, '').toLowerCase() : '' }
}

export const findBadge = (entry: string) => COURSE_BADGES.find(b => b.name.toLowerCase() === parseCourse(entry).base)