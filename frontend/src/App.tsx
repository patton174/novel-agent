import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'
import { AnimatePresence } from 'framer-motion'
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
import { useJourneyTracker } from './hooks/useJourneyTracker'
import { PageTransition } from './components/PageTransition'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'))
const TestimonialsPage = lazy(() => import('./pages/TestimonialsPage'))
const GenericContentPage = lazy(() => import('./pages/GenericContentPage'))
const EditorPage = lazy(() => import('./pages/EditorPage'))
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const DashboardHomePage = lazy(() => import('./pages/dashboard/DashboardHomePage'))
const NovelsPage = lazy(() => import('./pages/dashboard/NovelsPage'))
const BookstorePage = lazy(() => import('./pages/dashboard/BookstorePage'))
const BillingPage = lazy(() => import('./pages/dashboard/BillingPage'))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminHomePage = lazy(() => import('./pages/admin/AdminHomePage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const StatsPage = lazy(() => import('./pages/admin/StatsPage'))
const CrawlerPage = lazy(() => import('./pages/admin/CrawlerPage'))

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

function AppRoutes() {
  const location = useLocation()
  useJourneyTracker()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/features" element={<PageTransition><FeaturesPage /></PageTransition>} />
        <Route path="/pricing" element={<PageTransition><PricingPage /></PageTransition>} />
        <Route path="/testimonials" element={<PageTransition><TestimonialsPage /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><GenericContentPage title="隐私政策" /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><GenericContentPage title="用户协议" /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><GenericContentPage title="联系我们" /></PageTransition>} />
        
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
        <Route path="/verify-email" element={<PageTransition><VerifyEmailPage /></PageTransition>} />
        
        <Route path="/editor/:chapterId?" element={<PageTransition><EditorPage /></PageTransition>} />
        
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <PageTransition><DashboardLayout /></PageTransition>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardHomePage />} />
          <Route path="novels" element={<NovelsPage />} />
          <Route path="bookstore" element={<BookstorePage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <PageTransition><AdminLayout /></PageTransition>
            </RequireAdmin>
          }
        >
          <Route index element={<AdminHomePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="crawler" element={<CrawlerPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
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
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
