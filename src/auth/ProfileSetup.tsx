import { useState } from 'react'
import { emptyProfile } from '../data/profiles'
import type { Profile } from '../types'
import { RegistrationPage } from '../pages/RegistrationPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { LogoutButton } from './AuthGate'
export function ProfileSetup({ userId, onSave }: { userId: string; onSave: (profile: Profile) => Promise<void> }) {
  const [draft, setDraft] = useState(() => emptyProfile(userId))
  const [step, setStep] = useState(1)
  return <div className="phone"><header className="brand"><div className="wordmark"><i aria-hidden="true" />Common Ground</div><LogoutButton /></header><main className="page">
    {step === 1 ? <RegistrationPage initial={draft} editing={false} firstSetup onBack={() => setStep(1)} onContinue={profile => { setDraft(profile); setStep(2) }} />
      : <OnboardingPage profile={draft} editing={false} onBack={profile => { setDraft(profile); setStep(1) }} onFinish={onSave} />}
  </main></div>
}
