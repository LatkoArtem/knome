import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from './store'
import ErrorBoundary from './components/ErrorBoundary'
import NavBar from './components/NavBar'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Learning from './pages/Learning'
import Finance from './pages/Finance'
import Health from './pages/Health'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  const userId = useStore((s) => s.userId)
  return userId ? children : <Navigate to="/login" replace />
}

function LayoutWithNav({ children }) {
  const location = useLocation()
  const noNav = ['/onboarding', '/login']
  const showNav = !noNav.includes(location.pathname)
  return (
    <>
      {children}
      {showNav && <NavBar />}
    </>
  )
}

function LanguageSync() {
  const { i18n } = useTranslation()
  const language = useStore((s) => s.language)
  useEffect(() => { i18n.changeLanguage(language) }, [language])
  return null
}

export default function App() {
  const theme = useStore((s) => s.theme)

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ErrorBoundary>
          <BrowserRouter>
            <LanguageSync />
            <LayoutWithNav>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/learning" element={<PrivateRoute><Learning /></PrivateRoute>} />
                <Route path="/finance" element={<PrivateRoute><Finance /></PrivateRoute>} />
                <Route path="/health" element={<PrivateRoute><Health /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/chat" replace />} />
              </Routes>
            </LayoutWithNav>
          </BrowserRouter>
        </ErrorBoundary>
      </div>
    </div>
  )
}
