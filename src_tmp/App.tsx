import { useEffect, useRef, useState } from 'react'
import { useCommunity } from './context/CommunityContext'
import { emptyProfile } from './data/profiles'
import { EVENT_TYPES } from './data/config'
import type { BackPage, FeedId, Page, Profile } from './types'
import { Avatar } from './components/Avatar'
import { BottomNav } from './components/BottomNav'
import { Icon } from './components/Icon'
import { ResetDialog } from './components/ResetDialog'
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
    const backTo: BackPage = page.kind === 'detail' ? page : page.kind === 'profile' ? page.backTo : page.kind === 'leaderboard' ? page : { kind: 'feed' }
    setPage({ kind: 'profile', personId, backTo })
  }
  function finishRegistration(profile: Profile) { store.saveProfile(profile); backToFeed(); notify('You’re all set. Your profile and preferences are saved.') }
  function resetDemo() { store.resetDemo(); setRegistrationDraft(emptyProfile()); setFeed('social'); setShowReset(false); backToFeed(); notify('Demo reset. Start again with Register.') }
  let content
  switch (page.kind) {
    case 'leaderboard': content = <LeaderboardPage onProfile={openProfile} />; break
    case 'feed': content = <EventFeedPage feed={feed} onEvent={eventId => setPage({ kind: 'detail', eventId })} onProfile={openProfile} />; break
    case 'create': content = <CreateEventPage feed={feed} onBack={backToFeed} onPublished={event => { setFeed(EVENT_TYPES[event.type].feed); backToFeed(); notify('Event published to your feed.') }} />; break
    case 'detail': content = <EventDetailPage eventId={page.eventId} onBack={backToFeed} onProfile={openProfile} onReview={() => setPage({ kind: 'review', eventId: page.eventId })} onRegister={startRegistration} notify={notify} />; break
    case 'review': content = <ReviewPage eventId={page.eventId} onBack={() => setPage({ kind: 'detail', eventId: page.eventId })} onPosted={() => { setPage({ kind: 'detail', eventId: page.eventId }); notify('Your review has been posted.') }} />; break
    case 'profile': content = <ProfilePage personId={page.personId} onBack={() => setPage(page.backTo)} onEdit={startRegistration} notify={notify} />; break
    case 'register': content = <RegistrationPage initial={registrationDraft} editing={!!store.snapshot.profile} onBack={backToFeed} onContinue={draft => { setRegistrationDraft(draft); setPage({ kind: 'onboarding' }) }} />; break
    case 'onboarding': content = <OnboardingPage profile={registrationDraft} editing={!!store.snapshot.profile} onBack={draft => { setRegistrationDraft(draft); setPage({ kind: 'register' }) }} onFinish={finishRegistration} />; break
  }
  return <div className="phone">
    <div className="status"><span>9:41</span><svg viewBox="0 0 50 18" role="img" aria-label="Connected, full battery"><path d="M2 14v-3m4 3V8m4 6V5m4 9V2M21 6a7 7 0 0 1 10 0m-8 3a4 4 0 0 1 6 0m-3 3v1" /><rect x="36" y="4" width="11" height="10" rx="2" /><path d="M49 7v4m-10-4h5v4h-5z" /></svg></div>
    <header className="brand"><div className="wordmark"><Icon name="leaf" />Common Ground</div>{!formFlow && <div className="header-actions"><Avatar person={store.snapshot.profile} onClick={() => openProfile('me')} label="View your profile" /><button type="button" className="register-button" onClick={startRegistration}>{store.snapshot.profile ? 'Edit profile' : 'Register'}</button></div>}</header>
    {!formFlow && <div className="userbar"><label className="role-box">Demo role <select aria-label="Demo role" value={store.role} onChange={e => { store.setRole(e.target.value === 'organizer' ? 'organizer' : 'member'); backToFeed() }}><option value="member">Member</option><option value="organizer">Organizer</option></select></label><button className="reset-button" type="button" onClick={() => setShowReset(true)}>Reset demo</button></div>}
    {store.storageWarning && <p className="storage-warning" role="status">{store.storageWarning}</p>}
    <main className="page" ref={main} key={page.kind}>{content}</main>
    {page.kind === 'feed' && !(feed === 'notices' && store.role !== 'organizer') && <button type="button" className="fab" aria-label="Create an event" onClick={() => setPage({ kind: 'create' })}><Icon name="pencil" /></button>}
    {!formFlow && <BottomNav active={page.kind === 'leaderboard' || (page.kind === 'profile' && page.backTo.kind === 'leaderboard') ? 'leaderboard' : feed} onSelect={id => { if (id === 'leaderboard') setPage({ kind: 'leaderboard' }); else { setFeed(id); backToFeed() } }} />}
    <div className="homebar" aria-hidden="true" /><div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    {showReset && <ResetDialog onConfirm={resetDemo} onCancel={() => setShowReset(false)} />}
  </div>
}
