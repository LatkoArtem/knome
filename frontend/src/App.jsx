import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store'
import ErrorBoundary from './components/ErrorBoundary'
import Sidebar from './components/Sidebar'
import QuickAdd from './components/QuickAdd'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Learning from './pages/Learning'
import Finance from './pages/Finance'
import Health from './pages/Health'
import Workout from './pages/Workout'
import Productivity from './pages/Productivity'
import Reflection from './pages/Reflection'
import Relationships from './pages/Relationships'
import Career from './pages/Career'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  const userId = useStore((s) => s.userId)
  return userId ? children : <Navigate to="/login" replace />
}

const NO_SHELL = ['/login', '/onboarding']

/* Scrolls main content to top on every route change */
function ScrollReset({ mainRef }) {
  const { pathname } = useLocation()
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function Shell({ children }) {
  const location = useLocation()
  const hasShell = !NO_SHELL.includes(location.pathname)
  const mainRef = useRef(null)

  if (!hasShell) return children

  return (
    <div className="flex h-screen bg-[#09090B]">
      <Sidebar />
      <main
        ref={mainRef}
        className="flex-1 lg:ml-[220px] min-h-screen overflow-y-auto pb-14 lg:pb-0 focus:outline-none"
      >
        <ScrollReset mainRef={mainRef} />
        {children}
      </main>
      <QuickAdd />
    </div>
  )
}

function LanguageSync() {
  const { i18n } = useTranslation()
  const language = useStore((s) => s.language)
  useEffect(() => { i18n.changeLanguage(language) }, [language, i18n])
  return null
}

export default function App() {
  const theme = useStore((s) => s.theme)

  return (
    /* Apply `dark` class so Tailwind dark: variants work. Body bg stays #09090B in dark. */
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-[#09090B] text-zinc-100 min-h-screen font-sans antialiased`}>
      <ErrorBoundary>
        <BrowserRouter>
          <LanguageSync />
          <Shell>
            <Routes>
              <Route path="/login"      element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/chat"       element={<PrivateRoute><Chat /></PrivateRoute>} />
              <Route path="/dashboard"  element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/learning"   element={<PrivateRoute><Learning /></PrivateRoute>} />
              <Route path="/finance"    element={<PrivateRoute><Finance /></PrivateRoute>} />
              <Route path="/health"       element={<PrivateRoute><Health /></PrivateRoute>} />
              <Route path="/workout"       element={<PrivateRoute><Workout /></PrivateRoute>} />
              <Route path="/productivity"  element={<PrivateRoute><Productivity /></PrivateRoute>} />
              <Route path="/reflection"    element={<PrivateRoute><Reflection /></PrivateRoute>} />
              <Route path="/relationships" element={<PrivateRoute><Relationships /></PrivateRoute>} />
              <Route path="/career"        element={<PrivateRoute><Career /></PrivateRoute>} />
              <Route path="/settings"      element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/"           element={<Navigate to="/chat" replace />} />
            </Routes>
          </Shell>
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  )
}
