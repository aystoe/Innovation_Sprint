import { createSeedEvents } from '../data/events'
import { freshOrganizerState, CONTRIBUTIONS } from './organizer'
import { EVENT_TYPES } from '../data/config'
import { UPCOMING_EVENTS } from '../data/upcomingEvents'
import type { Snapshot, Profile, CommunityEvent, Review, AudienceTrait, Conversation } from '../types'

/** Replace this adapter with API calls when a backend is added. UI code stays unchanged. */
export const STORAGE_KEY = 'common-ground-react-demo-v1'
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string')
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))
function validProfile(v: unknown): v is Profile {
  return record(v) && ['id','name','occupation','bio','major','interests','courses','photo','social','socialOther'].every(k => typeof v[k] === 'string') && typeof v.name === 'string' && !!v.name.trim() && /^[0-9a-f-]{36}$/i.test(String(v.id)) && strings(v.topics) && strings(v.attendedEventIds) && (v.openTo === undefined || (strings(v.openTo) && v.openTo.every(type=>CONTRIBUTIONS.includes(type as typeof CONTRIBUTIONS[number]))))
}
function validReview(v: unknown): v is Review {
  return record(v) && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.text === 'string' && strings(v.photos) && date(v.date)
}
function validTrait(v: unknown): v is AudienceTrait {
  return record(v) && ['interests','courses','profession','major'].includes(String(v.kind)) && typeof v.value === 'string'
}
function validEvent(v: unknown): v is CommunityEvent {
  return record(v) && ['id','title','description','location','author','authorId','color','art'].every(k => typeof v[k] === 'string') && typeof v.type === 'string' && Object.hasOwn(EVENT_TYPES, v.type) && (v.image === undefined || typeof v.image === 'string') && (v.topics === undefined || strings(v.topics)) && date(v.start) && date(v.end) && Array.isArray(v.reviews) && v.reviews.every(validReview) && record(v.audience) && ['everyone','targeted'].includes(String(v.audience.mode)) && Array.isArray(v.audience.traits) && v.audience.traits.every(validTrait)
}
function validConversation(v: unknown): v is Conversation {
  return record(v) && typeof v.personId === 'string' && Array.isArray(v.messages) && v.messages.every(m =>
    record(m) && typeof m.id === 'string' && ['me', 'them'].includes(String(m.sender)) && typeof m.text === 'string' && date(m.createdAt) && (m.automated === undefined || typeof m.automated === 'boolean'))
}
function validOrganizer(value: unknown): boolean {
  return record(value) && typeof value.handovers === 'number' && Number.isInteger(value.handovers) && value.handovers >= 0 && Array.isArray(value.requests) && value.requests.every(request=>record(request) && ['id','title','body'].every(key=>typeof request[key]==='string') && CONTRIBUTIONS.includes(request.type as typeof CONTRIBUTIONS[number]) && date(request.createdAt) && Array.isArray(request.recipients) && request.recipients.every(person=>record(person) && typeof person.personId==='string' && ['delivered','opened','yes','no'].includes(String(person.status))))
}
export const freshSnapshot = (): Snapshot => ({ version: 1, profile: null, events: createSeedEvents(), conversations: [], organizer: freshOrganizerState() })
export function loadSnapshot(): { snapshot: Snapshot; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { snapshot: freshSnapshot(), warning: '' }
    const v: unknown = JSON.parse(raw)
    if (!record(v) || v.version !== 1 || !(v.profile === null || validProfile(v.profile)) || !Array.isArray(v.events) || !v.events.every(validEvent)) throw new Error('Invalid saved data')
      const demoIds = new Set([
        'social-1',
        'social-2',
        'social-3',
        'official-1',
        'official-2',
        'official-3',
        'notice-1',
        'notice-2',
      ])

      const demoDates = new Map(
        createSeedEvents()
          .filter(event => demoIds.has(event.id))
          .map(event => [event.id, event])
      )

      const savedEvents = (v.events as CommunityEvent[]).map(event => {
        const updated = demoDates.get(event.id)

        return updated
          ? {
              ...event,
              start: updated.start,
              end: updated.end,
            }
          : event
      })

    const mergedEvents = [
      ...UPCOMING_EVENTS.filter(
        upcoming => !savedEvents.some(saved => saved.id === upcoming.id)
      ),
      ...savedEvents,
    ]
    const chatsValid = v.conversations === undefined || (Array.isArray(v.conversations) && v.conversations.every(validConversation) && new Set(v.conversations.map(c => c.personId)).size === v.conversations.length)
    return { snapshot: { ...v, organizer: validOrganizer(v.organizer) ? v.organizer : freshOrganizerState(), conversations: chatsValid ? (v.conversations ?? []) : [],  events: mergedEvents,} as unknown as Snapshot, warning: chatsValid ? '' : 'Saved chats could not be loaded. Your profile and events are unchanged.' }
  } catch { return { snapshot: freshSnapshot(), warning: 'Saved demo data could not be loaded. Starting with sample data.' } }
}
export function saveSnapshot(snapshot: Snapshot): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); return true } catch { return false }
}
export function clearSnapshot(): boolean {
  try { localStorage.removeItem(STORAGE_KEY); return true } catch { return false }
}
