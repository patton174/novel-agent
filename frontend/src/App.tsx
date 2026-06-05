import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { theme } from './styles/theme'
import { AppToastHost } from './components/ui/AppToastHost'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireAdmin } from './components/guards/RequireAdmin'
import { fetchUserInfo } from './api/userApi'
import { migrateLegacyAuthStorage, isLoggedIn } from './utils/auth'
import { primeFingerprint } from './security/fingerprint'
import { ensureSessionAndHeartbeat } from './security/heartbeat'
import { startSessionBootstrap } from './security/sessionBootstrap'
import { useUserStore } from './stores/userStore'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const EditorPage = lazy(() => import('./pages/EditorPage'))
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const DashboardHomePage = lazy(() => import('./pages/dashboard/DashboardHomePage'))
const NovelsPage = lazy(() => import('./pages/dashboard/NovelsPage'))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminHomePage = lazy(() => import('./pages/admin/AdminHomePage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const StatsPage = lazy(() => import('./pages/admin/StatsPage'))

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
    void startSessionBootstrap().then(() => {
      if (isLoggedIn() && !useUserStore.getState().profile) {
        void fetchUserInfo()
          .then((profile) => useUserStore.getState().setProfile(profile))
          .catch(() => {
            /* profile optional until guarded route loads */
          })
      }
    })
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
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardHomePage />} />
              <Route path="novels" element={<NovelsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminHomePage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="stats" element={<StatsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
