import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CommunityProvider } from './context/CommunityProvider'
import './styles/app.css'
createRoot(document.getElementById('root')!).render(<StrictMode><CommunityProvider><App /></CommunityProvider></StrictMode>)
