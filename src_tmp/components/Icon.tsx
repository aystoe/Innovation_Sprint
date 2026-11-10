import type { ReactNode } from 'react'
import type { IconName } from '../types'
const paths: Record<IconName, ReactNode> = {
  'leaf': <><path d="M20 3C8 2 2 8 5 15s15 4 15-12ZM4 21 15 10"/></>,
  'bag': <><rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a21 21 0 0 0 18 0m-9 0v4"/></>,
  'people': <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/></>,
  'notice': <><path d="m3 10 16-6v14L3 14v-4Zm16-2h2v6h-2M7 15l2 6h4l-2-5"/></>,
  'pencil': <><path d="m16 3 5 5L8 21H3v-5L16 3Zm-3 3 5 5M3 16l5 5"/></>,
  'calendar': <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></>,
  'pin': <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
  'back': <><path d="m14 5-7 7 7 7M7 12h14"/></>,
  'photo': <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 6"/></>,
  'lock': <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
  'star': <><path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/></>,
  'bell': <><path d="M5 10a7 7 0 0 1 14 0c0 6 3 6 3 8H2c0-2 3-2 3-8Zm5 11h4M12 1v2"/></>,
}
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}
