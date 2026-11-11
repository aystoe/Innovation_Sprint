import { createContext, useContext } from 'react'
import type { CommunityEvent, EventInput, Profile, Role, Snapshot, ContributionType, RequestStatus } from '../types'
export interface CommunityStore {
  eventsLoading: boolean
  eventsError: string
  refreshEvents: () => Promise<void>
  updateEvent: (event: CommunityEvent, input: EventInput) => Promise<CommunityEvent>
  userId: string
  snapshot: Snapshot
  role: Role
  setRole: (role: Role) => void
  storageWarning: string
  getPerson: (id: string) => Profile | null
  saveProfile: (profile: Profile) => Promise<void>
  publishEvent: (input: EventInput, creationId?: string) => Promise<CommunityEvent>
  addReview: (eventId: string, text: string, photos: string[]) => void
  toggleParticipation: (eventId: string) => Promise<void>
  createRequest: (personId: string, type: ContributionType, title: string, body: string) => void
  respondRequest: (requestId: string, status: RequestStatus, demoPersonId?: string) => void
  completeHandover: () => void
  resetDemo: () => void
}
export const CommunityContext = createContext<CommunityStore | null>(null)
export function useCommunity() {
  const value = useContext(CommunityContext)
  if (!value) throw new Error('useCommunity must be used inside CommunityProvider')
  return value
}
