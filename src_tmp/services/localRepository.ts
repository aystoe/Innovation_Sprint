import { createSeedEvents } from '../data/events'
import { EVENT_TYPES } from '../data/config'
import type { Snapshot, Profile, CommunityEvent, Review, AudienceTrait } from '../types'

/** Replace this adapter with API calls when a backend is added. UI code stays unchanged. */
export const STORAGE_KEY = 'common-ground-react-demo-v1'
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string')
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
function validProfile(v: unknown): v is Profile {
  return record(v) && ['id','name','occupation','bio','major','interests','courses','photo','social','socialOther'].every(k => typeof v[k] === 'string') && typeof v.name === 'string' && !!v.name.trim() && v.id === 'me' && strings(v.topics) && strings(v.attendedEventIds)
}
function validReview(v: unknown): v is Review {
  return record(v) && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.text === 'string' && strings(v.photos) && date(v.date)
}
function validTrait(v: unknown): v is AudienceTrait {
  return record(v) && ['interests','courses','profession','major'].includes(String(v.kind)) && typeof v.value === 'string'
}
function validEvent(v: unknown): v is CommunityEvent {
  return record(v) && ['id','title','description','location','author','authorId','color','art'].every(k => typeof v[k] === 'string') && typeof v.type === 'string' && Object.hasOwn(EVENT_TYPES, v.type) && date(v.start) && date(v.end) && Array.isArray(v.reviews) && v.reviews.every(validReview) && record(v.audience) && ['everyone','targeted'].includes(String(v.audience.mode)) && Array.isArray(v.audience.traits) && v.audience.traits.every(validTrait)
}
export const freshSnapshot = (): Snapshot => ({ version: 1, profile: null, events: createSeedEvents() })
export function loadSnapshot(): { snapshot: Snapshot; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { snapshot: freshSnapshot(), warning: '' }
    const v: unknown = JSON.parse(raw)
    if (!record(v) || v.version !== 1 || !(v.profile === null || validProfile(v.profile)) || !Array.isArray(v.events) || !v.events.every(validEvent)) throw new Error('Invalid saved data')
    return { snapshot: v as unknown as Snapshot, warning: '' }
  } catch { return { snapshot: freshSnapshot(), warning: 'Saved demo data could not be loaded. Starting with sample data.' } }
}
export function saveSnapshot(snapshot: Snapshot): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); return true } catch { return false }
}
export function clearSnapshot(): boolean {
  try { localStorage.removeItem(STORAGE_KEY); return true } catch { return false }
}
