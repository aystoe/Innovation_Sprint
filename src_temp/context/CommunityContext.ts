import { createContext, useContext } from 'react'
import type { CommunityEvent, EventInput, Profile, Role, Snapshot, ContributionType, RequestStatus } from '../types'
export interface CommunityStore {
  snapshot: Snapshot
  role: Role
  setRole: (role: Role) => void
  storageWarning: string
  getPerson: (id: string) => Profile | null
  saveProfile: (profile: Profile) => void
  publishEvent: (input: EventInput) => CommunityEvent
  addReview: (eventId: string, text: string, photos: string[]) => void
  toggleParticipation: (eventId: string) => void
  sendMessage: (personId: string, text: string) => void
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
