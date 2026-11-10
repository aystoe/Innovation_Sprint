/** Shared contracts: update these before changing data passed between pages. */
export type FeedId = 'official' | 'social' | 'notices'
export type NavigationId = FeedId | 'leaderboard'
export type RankingPeriod = 'day' | 'month' | 'year'
export type Role = 'member' | 'organizer'
export type EventType = 'job' | 'cofounder' | 'official' | 'hobby' | 'alumni' | 'party' | 'announcement'
export type IconName = 'leaf' | 'bag' | 'people' | 'notice' | 'pencil' | 'calendar' | 'pin' | 'back' | 'photo' | 'lock' | 'star' | 'bell' | 'trophy'
export type TraitKind = 'interests' | 'courses' | 'profession' | 'major'
export type ContactPreference = 'gray' | 'yellow' | 'green'
export interface AudienceTrait { kind: TraitKind; value: string }
export interface Audience { mode: 'everyone' | 'targeted'; traits: AudienceTrait[] }
export interface Profile {
  id: string
  name: string
  occupation: string
  bio: string
  major: string
  interests: string
  courses: string
  photo: string
  social: string
  socialOther: string
  topics: string[]
  attendedEventIds: string[]
  contactPreference?: ContactPreference

}
export interface Review { id: string; name: string; text: string; photos: string[]; date: string }
export interface CommunityEvent {
  id: string
  type: EventType
  title: string
  description: string
  location: string
  start: string
  end: string
  author: string
  authorId: string
  color: string
  art: string
  audience: Audience
  topics?: string[]
  reviews: Review[]
}
export type EventInput = Pick<CommunityEvent, 'type' | 'title' | 'description' | 'location' | 'start' | 'end' | 'audience' | 'topics'>
export interface Snapshot { version: 1; profile: Profile | null; events: CommunityEvent[] }
export type BackPage = { kind: 'feed' } | { kind: 'leaderboard' } | { kind: 'detail'; eventId: string }
export type Page = BackPage
  | { kind: 'create' }
  | { kind: 'profile'; personId: string; backTo: BackPage }
  | { kind: 'register' }
  | { kind: 'onboarding' }
  | { kind: 'review'; eventId: string }
