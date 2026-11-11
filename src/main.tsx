import {AppErrorBoundary} from './components/AppErrorBoundary'
import {Capacitor} from '@capacitor/core'
import {NativeBridge} from './native/NativeBridge'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CommunityProvider } from './context/CommunityProvider'
import { AuthProvider } from './auth/AuthProvider'
import { AuthGate } from './auth/AuthGate'
import { useAuth } from './auth/AuthContext'
import './styles/app.css'
import './styles/v3.css'
import './styles/native.css'
if(Capacitor.isNativePlatform())document.documentElement.classList.add('native-app')
function SignedInApp() {
  const { session } = useAuth()
  return session ? <CommunityProvider key={session.user.id} userId={session.user.id}><App /></CommunityProvider> : null
}
createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><NativeBridge/><AppErrorBoundary><AuthGate><SignedInApp /></AuthGate></AppErrorBoundary></AuthProvider></StrictMode>)
