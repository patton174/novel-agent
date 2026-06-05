import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { theme } from './styles/theme'
import { AppToastHost } from './components/ui/AppToastHost'
import { migrateLegacyAuthStorage } from './utils/auth'
import { primeFingerprint } from './security/fingerprint'
import { ensureSessionAndHeartbeat } from './security/heartbeat'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const EditorPage = lazy(() => import('./pages/EditorPage'))

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: '#64748b',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      加载中…
    </div>
  )
}

function App() {
  useEffect(() => {
    migrateLegacyAuthStorage()
    primeFingerprint()
    void ensureSessionAndHeartbeat()
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <AppToastHost />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/editor/:chapterId?" element={<EditorPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
