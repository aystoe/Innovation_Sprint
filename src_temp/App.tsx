import { useEffect, useRef, useState } from 'react'
import { useCommunity } from './context/CommunityContext'
import { emptyProfile } from './data/profiles'
import { EVENT_TYPES } from './data/config'
import type { BackPage, FeedId, Page, Profile } from './types'
import { Avatar } from './components/Avatar'
import { BottomNav } from './components/BottomNav'
import { Icon } from './components/Icon'
import { ResetDialog } from './components/ResetDialog'
import { OrganizerPage } from './pages/OrganizerPage'
import { ChatsPage } from './pages/ChatsPage'
import { ChatPage } from './pages/ChatPage'
import { MembersPage } from './pages/MembersPage'
import { emptyMemberFilters } from './services/memberDirectory'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { EventFeedPage } from './pages/EventFeedPage'
import { CreateEventPage } from './pages/CreateEventPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { ReviewPage } from './pages/ReviewPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegistrationPage } from './pages/RegistrationPage'
import { OnboardingPage } from './pages/OnboardingPage'

/** App owns navigation only. Pages own their forms; the provider owns shared data. */
export default function App() {
  const store = useCommunity()
  const [feed, setFeed] = useState<FeedId>('social')
  const [page, setPage] = useState<Page>({ kind: 'feed' })
  const [registrationDraft, setRegistrationDraft] = useState<Profile>(emptyProfile)
  const [toast, setToast] = useState('')
  const [memberFilters, setMemberFilters] = useState(emptyMemberFilters)
  const [chatQuery, setChatQuery] = useState('')
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({})
  const [showReset, setShowReset] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const main = useRef<HTMLElement>(null)
  const formFlow = page.kind === 'register' || page.kind === 'onboarding'
  useEffect(() => { main.current?.scrollTo?.(0, 0) }, [page, feed])
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  function notify(message: string) {
    clearTimeout(toastTimer.current); setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }
  function backToFeed() { setPage({ kind: 'feed' }) }
  function startRegistration() { setRegistrationDraft(store.snapshot.profile ? structuredClone(store.snapshot.profile) : emptyProfile()); setPage({ kind: 'register' }) }
  function openProfile(personId: string) {
    if (personId === 'me' && !store.snapshot.profile) { startRegistration(); return }
    const backTo: BackPage = page.kind === 'detail' ? page : page.kind === 'profile' ? page.backTo : (page.kind === 'leaderboard' || page.kind === 'members' || page.kind === 'chat' || page.kind === 'chats' || page.kind === 'room' || page.kind === 'find' || page.kind === 'asks') ? page : { kind: 'feed' }
    setPage({ kind: 'profile', personId, backTo })
  }
  function openChat(personId: string) { if (personId !== 'me' && store.getPerson(personId)) setPage({ kind: 'chat', personId }) }
  function finishRegistration(profile: Profile) { store.saveProfile(profile); backToFeed(); notify('You’re all set. Your profile and preferences are saved.') }
  function resetDemo() { store.resetDemo(); setChatQuery(''); setChatDrafts({}); setMemberFilters(emptyMemberFilters()); setRegistrationDraft(emptyProfile()); setFeed('social'); setShowReset(false); backToFeed(); notify('Demo reset. Start again with Register.') }
  const navigationPage = page.kind === 'profile' ? page.backTo : page
  const activeNav = navigationPage.kind === 'room' || navigationPage.kind === 'find' || navigationPage.kind === 'asks' || navigationPage.kind === 'create' ? navigationPage.kind : navigationPage.kind === 'leaderboard' ? null : navigationPage.kind === 'chat' || navigationPage.kind === 'chats' ? 'chats' : navigationPage.kind === 'members' ? 'members' : feed === 'notices' ? 'social' : feed
  let content
  switch (page.kind) {
    case 'room': case 'find': case 'asks': content = <OrganizerPage view={page.kind} onNavigate={kind=>setPage({kind})} onFeed={id=>{setFeed(id);backToFeed()}} notify={notify}/>; break
    case 'chats': content = <ChatsPage query={chatQuery} onQueryChange={setChatQuery} onChat={openChat} />; break
    case 'chat': content = <ChatPage key={page.personId} personId={page.personId} draft={chatDrafts[page.personId] ?? ''} onDraftChange={draft => setChatDrafts(current => ({ ...current, [page.personId]: draft }))} onBack={() => setPage({ kind: 'chats' })} onProfile={openProfile} />; break
    case 'members': content = <MembersPage filters={memberFilters} onFiltersChange={setMemberFilters} onProfile={openProfile} />; break
    case 'leaderboard': content = <LeaderboardPage onProfile={openProfile} />; break
    case 'feed': content = <EventFeedPage feed={feed} onEvent={eventId => setPage({ kind: 'detail', eventId })} />; break
    case 'create': content = <CreateEventPage onRequestHelp={()=>setPage({kind:'find'})} feed={feed} onBack={()=>store.role==='organizer' ? setPage({kind:'room'}) : backToFeed()} onPublished={event => { setFeed(EVENT_TYPES[event.type].feed); backToFeed(); notify('Event published to your feed.') }} />; break
    case 'detail': content = <EventDetailPage eventId={page.eventId} onBack={backToFeed} onReview={() => setPage({ kind: 'review', eventId: page.eventId })} onRegister={startRegistration} notify={notify} />; break
    case 'review': content = <ReviewPage eventId={page.eventId} onBack={() => setPage({ kind: 'detail', eventId: page.eventId })} onPosted={() => { setPage({ kind: 'detail', eventId: page.eventId }); notify('Your review has been posted.') }} />; break
    case 'profile': content = <ProfilePage personId={page.personId} onBack={() => setPage(page.backTo)} onEdit={startRegistration} notify={notify} />; break
    case 'register': content = <RegistrationPage initial={registrationDraft} editing={!!store.snapshot.profile} onBack={backToFeed} onContinue={draft => { setRegistrationDraft(draft); setPage({ kind: 'onboarding' }) }} />; break
    case 'onboarding': content = <OnboardingPage profile={registrationDraft} editing={!!store.snapshot.profile} onBack={draft => { setRegistrationDraft(draft); setPage({ kind: 'register' }) }} onFinish={finishRegistration} />; break
  }
  return <div className={`phone role-${store.role}`}>
    <header className="brand"><div className="wordmark"><i aria-hidden="true" />Common Ground</div>{store.role==='organizer' && !formFlow && <span className="organizer-badge">Organizer</span>}{!formFlow && <div className="header-actions"><button type="button" className={`header-trophy ${navigationPage.kind === 'leaderboard' ? 'selected' : ''}`} aria-label="View leaderboard" title="Leaderboard" aria-pressed={navigationPage.kind === 'leaderboard'} onClick={() => setPage({ kind: 'leaderboard' })}><Icon name="trophy" /></button>{store.snapshot.profile ? <Avatar person={store.snapshot.profile} onClick={() => openProfile('me')} label="View your profile" /> : <button type="button" className="register-button" onClick={startRegistration}>Register</button>}</div>}</header>
    {!formFlow && <div className="userbar"><div className="role-switch" role="group" aria-label="Demo perspective">{(['member','organizer'] as const).map(role=><button type="button" key={role} aria-pressed={store.role===role} onClick={()=>{store.setRole(role);setPage({kind:role==='organizer'?'room':'feed'})}}>{role==='organizer'?'Organizer':'Member'}</button>)}</div><button className="reset-button" type="button" onClick={()=>setShowReset(true)}>Reset demo</button></div>}
    {store.storageWarning && <p className="storage-warning" role="status">{store.storageWarning}</p>}
    <main className={`page ${page.kind === 'chat' ? 'chat-page' : ''}`} ref={main} key={page.kind}>{content}</main>

    {page.kind === 'profile' && page.personId !== 'me' && store.getPerson(page.personId) && <button type="button" className="fab profile-chat-button" aria-label={`Chat with ${store.getPerson(page.personId)?.name}`} onClick={() => openChat(page.personId)}><Icon name="chat" /><span>Chat</span></button>}
    {!formFlow && <BottomNav role={store.role} active={activeNav} onSelect={id => { if (id === 'members' || id === 'chats' || id === 'create' || id === 'room' || id === 'find' || id === 'asks') setPage({ kind: id }); else { setFeed(id); backToFeed() } }} />}
    <div className="homebar" aria-hidden="true" /><div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    {showReset && <ResetDialog onConfirm={resetDemo} onCancel={() => setShowReset(false)} />}
  </div>
}
