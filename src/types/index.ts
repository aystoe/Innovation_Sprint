/** Shared contracts: update these before changing data passed between pages. */
export type FeedId = 'official' | 'social' | 'notices'
export type NavigationId = Exclude<FeedId, 'notices'> | 'members' | 'chats' | 'create' | 'room' | 'find' | 'asks'
export type RankingPeriod = 'month' | 'semester'
export type RankingRole = 'participant' | 'organizer'
export type Role = 'member' | 'organizer'
export type EventType = 'job' | 'cofounder' | 'official' | 'hobby' | 'alumni' | 'party' | 'announcement'
export type IconName = 'leaf' | 'bag' | 'people' | 'notice' | 'pencil' | 'calendar' | 'pin' | 'back' | 'photo' | 'lock' | 'star' | 'bell' | 'trophy' | 'search' | 'filter' | 'chat' | 'send' | 'plus' | 'home'
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
  openTo?: ContributionType[]
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
  channels?: { digest: boolean; slack: boolean; calendar: boolean }
  image?: string
  topics?: string[]
  reviews: Review[]
}
export type EventInput = Pick<CommunityEvent, 'type' | 'title' | 'description' | 'location' | 'start' | 'end' | 'audience' | 'topics' | 'image' | 'channels'>
export interface ChatMessage { id: string; sender: 'me' | 'them'; text: string; createdAt: string; automated?: boolean }
export interface Conversation { personId: string; messages: ChatMessage[] }
export type ContributionType = 'Speaker' | 'Jury' | 'Mentor' | 'Feedback'
export type RequestStatus = 'delivered' | 'opened' | 'yes' | 'no'
export interface OrganizerRequest { id: string; title: string; type: ContributionType; body: string; createdAt: string; recipients: { personId: string; status: RequestStatus }[] }
export interface OrganizerState { requests: OrganizerRequest[]; handovers: number }
export interface Snapshot { organizer?: OrganizerState; version: 1; profile: Profile | null; events: CommunityEvent[]; conversations: Conversation[] }
export type BackPage = { kind: 'feed' } | { kind: 'room' } | { kind: 'find' } | { kind: 'asks' } | { kind: 'chats' } | { kind: 'chat'; personId: string } | { kind: 'members' } | { kind: 'leaderboard' } | { kind: 'detail'; eventId: string }
export type Page = BackPage
  | { kind: 'create' }
  | { kind: 'profile'; personId: string; backTo: BackPage }
  | { kind: 'register' }
  | { kind: 'onboarding' }
  | { kind: 'review'; eventId: string }
