import { createContext, useContext } from 'react'
import type { CommunityEvent, EventInput, Profile, Role, Snapshot } from '../types'
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
  resetDemo: () => void
}
export const CommunityContext = createContext<CommunityStore | null>(null)
export function useCommunity() {
  const value = useContext(CommunityContext)
  if (!value) throw new Error('useCommunity must be used inside CommunityProvider')
  return value
}
