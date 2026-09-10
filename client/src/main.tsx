import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import TeacherRegistration from './screens/TeacherRegistration.tsx'

// The teacher registration portal is a public page — no customer account
// required — so it's routed here, before the authed App shell mounts at all.
const isTeacherRegistration = window.location.pathname === '/teacher-registration' || window.location.pathname.startsWith('/teacher-registration/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTeacherRegistration ? <TeacherRegistration /> : <App />}
  </StrictMode>,
)
