import { useLiveEvents } from '../hooks/useLiveEvents'
import { saveEvent, setRegistration } from '../services/eventRepository'
import { isDemoMode } from '../lib/dataMode'
import { useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { CommunityContext } from './CommunityContext'
import { SAMPLE_PROFILES } from '../data/profiles'
import { EVENT_TYPES } from '../data/config'
import { freshOrganizerState, addRequest, answerRequest } from '../services/organizer'
import type { ContributionType, RequestStatus } from '../types'
import { ChatProvider } from './ChatProvider'
import { canReadEvent, validateEvent } from '../services/eventRules'
import { createSeedEvents } from '../data/events'
import { ProfileSetup } from '../auth/ProfileSetup'
import { LogoutButton } from '../auth/AuthGate'
import { loadOwnProfile, persistOwnProfile } from '../services/profileRepository'
import { isEnded, newId } from '../utils/format'
import { isPhoto } from '../utils/avatar'
import type { EventInput, Profile, Role, Snapshot, CommunityEvent } from '../types'

export function CommunityProvider({ children, userId }: PropsWithChildren<{ userId: string }>) {
  // Demonstration content is in-memory only, separate from Auth and the real profile.
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ version: 1, profile: null,
    events: (isDemoMode ? createSeedEvents() : []), conversations: [], organizer: (isDemoMode ? freshOrganizerState(userId) : {requests:[],handovers:0}) }))
  const live = useLiveEvents(userId,!isDemoMode && !!snapshot.profile,snapshot.profile)
  const current = useRef(snapshot)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const mounted = useRef(false)
  const saving = useRef(false)
  useEffect(() => {
    mounted.current = true
    let active = true
    loadOwnProfile(userId).then(profile => {
      if (!active) return
      current.current = { ...current.current, profile }
      setSnapshot(current.current); setLoading(false); setLoadError('')
    }).catch(cause => {
      if (active) { setLoadError(cause instanceof Error ? cause.message : 'Profile could not be loaded.'); setLoading(false) }
    })
    return () => { active = false; mounted.current = false }
  }, [userId, attempt])
  const [role, setRole] = useState<Role>('member')
  const [storageWarning, setStorageWarning] = useState('')
  function commit(next: Snapshot) {
    current.current = next
    setSnapshot(next)
    // Do not persist another account’s profile or demo content in a shared snapshot key.
  }
  async function saveProfile(profile: Profile) {
    if (saving.current) throw new Error('A profile save is already in progress.')
    saving.current = true
    try {
      const result = await persistOwnProfile(userId, profile, current.current.profile)
      if (!mounted.current) return
      commit({ ...current.current, profile: { ...result.profile, attendedEventIds: current.current.profile?.attendedEventIds ?? [] } })
      setStorageWarning(result.warning)
    } finally { saving.current = false }
  }
  async function publishEvent(input: EventInput, creationId?: string): Promise<CommunityEvent> {
    if (!isDemoMode) {
      const result=await saveEvent(input,userId,role,undefined,creationId)
      setStorageWarning(result.warning);await live.refresh();return result.event
    }
    const error = validateEvent(input, role)
    if (error) throw new Error(error)
    const event: CommunityEvent = { ...input, title: input.title.trim(), description: input.description.trim(), location: input.location.trim(), start: new Date(input.start).toISOString(), end: new Date(input.end).toISOString(), id: newId(), authorId: userId, author: current.current.profile?.name || 'You', color: EVENT_TYPES[input.type].feed === 'official' ? 'lilac' : 'blue', art: input.title.slice(0, 55), reviews: [] }
    commit({ ...current.current, events: [event, ...current.current.events] })
    return event
  }
  async function updateEvent(event: CommunityEvent,input: EventInput): Promise<CommunityEvent> {
    if(event.authorId!==userId)throw new Error('Only the author may edit this event.')
    if(isDemoMode)throw new Error('Editing is available for live events only.')
    const result=await saveEvent(input,userId,role,event)
    setStorageWarning(result.warning);await live.refresh();return result.event
  }
  function addReview(eventId: string, text: string, photos: string[]) {
    if (!isDemoMode) throw new Error('This feature is not connected yet. No data was changed.')
    const event = current.current.events.find(e => e.id === eventId)
    if (!event || !canReadEvent(event, current.current.profile, role) || !isEnded(event)) throw new Error('Reviews are available only for ended events you can access.')
    if (!text.trim() && !photos.length) throw new Error('Add a comment or at least one photo to post your review.')
    if (photos.length > 4 || !photos.every(isPhoto)) throw new Error('Choose up to 4 valid photos.')
    const review = { id: newId(), name: current.current.profile?.name || 'You · Alumni', text: text.trim().slice(0, 2000), photos, date: new Date().toISOString() }
    commit({ ...current.current, events: current.current.events.map(e => e.id === eventId ? { ...e, reviews: [...e.reviews, review] } : e) })
  }
  async function toggleParticipation(eventId: string) {
    if(!isDemoMode){
      const event=live.events.find(e=>e.id===eventId)
      if(!event)throw new Error('Event unavailable')
      await setRegistration(eventId,event.myRegistration!=='registered');await live.refresh();return
    }
    const profile = current.current.profile
    const event = current.current.events.find(e => e.id === eventId)
    if (!profile) throw new Error('Register your profile to join events.')
    if (!event || !canReadEvent(event, profile, role) || ['job', 'cofounder', 'announcement'].includes(event.type)) throw new Error('You cannot join this event.')
    const ids = new Set(profile.attendedEventIds)
    if (ids.has(eventId)) ids.delete(eventId); else ids.add(eventId)
    commit({ ...current.current, profile: { ...profile, attendedEventIds: [...ids] } })
  }
  function createRequest(personId: string, type: ContributionType, title: string, body: string) {
    if (!isDemoMode) throw new Error('This feature is not connected yet. No data was changed.')
    if (role !== 'organizer') throw new Error('Only organizers can send requests.')
    const person = personId === userId ? current.current.profile : SAMPLE_PROFILES[personId]
    if (!person) throw new Error('Member not found.')
    commit({ ...current.current, organizer: addRequest(current.current.organizer ?? (isDemoMode ? freshOrganizerState(userId) : {requests:[],handovers:0}), person, type, title, body, userId) })
  }
  function respondRequest(requestId: string, status: RequestStatus, demoPersonId?: string) {
    if (!isDemoMode) throw new Error('This feature is not connected yet. No data was changed.')
    if (demoPersonId && role !== 'organizer') throw new Error('Only organizers can simulate sample responses.')
    if (!demoPersonId && !current.current.profile) throw new Error('Register to answer this request.')
    commit({ ...current.current, organizer: answerRequest(current.current.organizer ?? (isDemoMode ? freshOrganizerState(userId) : {requests:[],handovers:0}), requestId, demoPersonId ?? userId, status) })
  }
  function completeHandover() {
    if (!isDemoMode) throw new Error('This feature is not connected yet. No data was changed.')
    if (role !== 'organizer') throw new Error('Only organizers can prepare a handover.')
    const organizer = current.current.organizer ?? (isDemoMode ? freshOrganizerState(userId) : {requests:[],handovers:0})
    commit({ ...current.current, organizer: { ...organizer, handovers: organizer.handovers + 1 } })
  }
  function resetDemo() {
    commit({ version: 1, profile: current.current.profile ? { ...current.current.profile, attendedEventIds: [] } : null,
      events: (isDemoMode ? createSeedEvents() : []), conversations: [], organizer: (isDemoMode ? freshOrganizerState(userId) : {requests:[],handovers:0}) })
    setRole('member'); setStorageWarning('')
  }
  if (loading || loadError) return <div className="phone"><main className="page"><h1>Your profile</h1>
    {loading ? <p role="status">Loading your profile…</p> : <><p role="alert">{loadError}</p><button className="primary" onClick={() => { setLoading(true); setAttempt(n => n + 1) }}>Retry</button></>}
    <LogoutButton /></main></div>
  if (!snapshot.profile) return <ProfileSetup userId={userId} onSave={saveProfile} />
  return <CommunityContext.Provider value={{ eventsLoading:!isDemoMode && live.loading,eventsError:isDemoMode ? '' : live.error,refreshEvents:live.refresh,updateEvent,userId, snapshot:isDemoMode ? snapshot : {...snapshot,events:live.events}, role, setRole, storageWarning, getPerson: id => id === userId ? snapshot.profile : SAMPLE_PROFILES[id] ?? null, saveProfile, publishEvent, addReview, toggleParticipation, createRequest, respondRequest, completeHandover, resetDemo }}><ChatProvider key={userId} userId={userId}>{children}</ChatProvider></CommunityContext.Provider>
}
