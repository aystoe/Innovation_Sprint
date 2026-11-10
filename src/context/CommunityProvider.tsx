import { useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { CommunityContext } from './CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { EVENT_TYPES } from '../data/config'
import { freshOrganizerState, addRequest, answerRequest } from '../services/organizer'
import type { ContributionType, RequestStatus } from '../types'
import { sendDemoMessage } from '../services/chat'
import { canReadEvent, validateEvent } from '../services/eventRules'
import { clearSnapshot, freshSnapshot, loadSnapshot, saveSnapshot } from '../services/localRepository'
import { isEnded, newId } from '../utils/format'
import { isPhoto } from '../utils/avatar'
import type { EventInput, Profile, Role, Snapshot, CommunityEvent } from '../types'

export function CommunityProvider({ children }: PropsWithChildren) {
  const [initial] = useState(loadSnapshot)
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const current = useRef(snapshot)
  const [role, setRole] = useState<Role>('member')
  const [storageWarning, setStorageWarning] = useState(initial.warning)
  function commit(next: Snapshot) {
    current.current = next
    setSnapshot(next)
    setStorageWarning(saveSnapshot(next) ? '' : 'Browser storage is full or unavailable. Changes are available for this session only.')
  }
  function saveProfile(profile: Profile) {
    if (!profile.name.trim()) throw new Error('Please enter your name to continue.')
    commit({ ...current.current, profile: { ...profile, id: 'me', name: profile.name.trim(), attendedEventIds: [...new Set(profile.attendedEventIds)] } })
  }
  function publishEvent(input: EventInput): CommunityEvent {
    const error = validateEvent(input, role)
    if (error) throw new Error(error)
    const event: CommunityEvent = { ...input, title: input.title.trim(), description: input.description.trim(), location: input.location.trim(), start: new Date(input.start).toISOString(), end: new Date(input.end).toISOString(), id: newId(), authorId: role === 'organizer' ? 'organizer' : 'me', author: (role === 'organizer' ? 'Carl Meyer · Programme team' : current.current.profile?.name) || (role === 'organizer' ? 'You · Organizer' : 'You · Alumni'), color: EVENT_TYPES[input.type].feed === 'official' ? 'lilac' : 'blue', art: input.title.slice(0, 55), reviews: [] }
    commit({ ...current.current, events: [event, ...current.current.events] })
    return event
  }
  function addReview(eventId: string, text: string, photos: string[]) {
    const event = current.current.events.find(e => e.id === eventId)
    if (!event || !canReadEvent(event, current.current.profile, role) || !isEnded(event)) throw new Error('Reviews are available only for ended events you can access.')
    if (!text.trim() && !photos.length) throw new Error('Add a comment or at least one photo to post your review.')
    if (photos.length > 4 || !photos.every(isPhoto)) throw new Error('Choose up to 4 valid photos.')
    const review = { id: newId(), name: current.current.profile?.name || 'You · Alumni', text: text.trim().slice(0, 2000), photos, date: new Date().toISOString() }
    commit({ ...current.current, events: current.current.events.map(e => e.id === eventId ? { ...e, reviews: [...e.reviews, review] } : e) })
  }
  function toggleParticipation(eventId: string) {
    const profile = current.current.profile
    const event = current.current.events.find(e => e.id === eventId)
    if (!profile) throw new Error('Register your profile to join events.')
    if (!event || !canReadEvent(event, profile, role) || ['job', 'cofounder', 'announcement'].includes(event.type)) throw new Error('You cannot join this event.')
    const ids = new Set(profile.attendedEventIds)
    if (ids.has(eventId)) ids.delete(eventId); else ids.add(eventId)
    saveProfile({ ...profile, attendedEventIds: [...ids] })
  }
  function sendMessage(personId: string, text: string) {
    commit(sendDemoMessage(current.current, SAMPLE_PROFILES[personId] ?? null, text))
  }
  function createRequest(personId: string, type: ContributionType, title: string, body: string) {
    if (role !== 'organizer') throw new Error('Only organizers can send requests.')
    const person = personId === 'me' ? current.current.profile : SAMPLE_PROFILES[personId]
    if (!person) throw new Error('Member not found.')
    commit({ ...current.current, organizer: addRequest(current.current.organizer ?? freshOrganizerState(), person, type, title, body) })
  }
  function respondRequest(requestId: string, status: RequestStatus, demoPersonId?: string) {
    if (demoPersonId && role !== 'organizer') throw new Error('Only organizers can simulate sample responses.')
    if (!demoPersonId && !current.current.profile) throw new Error('Register to answer this request.')
    commit({ ...current.current, organizer: answerRequest(current.current.organizer ?? freshOrganizerState(), requestId, demoPersonId ?? 'me', status) })
  }
  function completeHandover() {
    if (role !== 'organizer') throw new Error('Only organizers can prepare a handover.')
    const organizer = current.current.organizer ?? freshOrganizerState()
    commit({ ...current.current, organizer: { ...organizer, handovers: organizer.handovers + 1 } })
  }
  function resetDemo() {
    const next = freshSnapshot()
    current.current = next; setSnapshot(next); setRole('member')
    // Save a fresh snapshot if removal is unavailable but writes are supported.
    const cleared = clearSnapshot()
    setStorageWarning(cleared || saveSnapshot(next) ? '' : 'Demo reset for this session only; browser storage could not be cleared.')
  }
  return <CommunityContext.Provider value={{ snapshot, role, setRole, storageWarning, getPerson: id => id === 'me' ? snapshot.profile : SAMPLE_PROFILES[id] ?? null, saveProfile, publishEvent, addReview, toggleParticipation, sendMessage, createRequest, respondRequest, completeHandover, resetDemo }}>{children}</CommunityContext.Provider>
}
