import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppToastHost } from './components/ui/AppToastHost'
import { ConfirmDialogHost } from './components/ui/ConfirmDialogHost'
import { RouteErrorBoundary } from './components/RouteErrorBoundary'
import { RouteSuspenseFallback } from './components/loading/RouteShellSuspense'
import { RouteProgressBar } from './components/loading/RouteProgressBar'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireAdmin } from './components/guards/RequireAdmin'
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
import { fetchUserInfo } from './api/userApi'
import { migrateLegacyAuthStorage, isLoggedIn } from './utils/auth'
import { primeFingerprint } from './security/fingerprint'
import { ensureSessionAndHeartbeat } from './security/heartbeat'
import { startSessionBootstrap } from './security/sessionBootstrap'
import { useUserStore } from './stores/userStore'
import { useAppSessionRestore } from './hooks/useAppSessionRestore'
import { PageTransition } from './components/PageTransition'
import { initializeTheme } from './stores/themeStore'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const GuidePage = lazy(() => import('./pages/GuidePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const GenericContentPage = lazy(() => import('./pages/GenericContentPage'))
const EditorPage = lazy(() => import('./pages/EditorPage'))
const DashboardHomePage = lazy(() => import('./pages/dashboard/DashboardHomePage'))
const NovelsPage = lazy(() => import('./pages/dashboard/NovelsPage'))
const BookstorePage = lazy(() => import('./pages/dashboard/BookstorePage'))
const MyLibraryPage = lazy(() => import('./pages/dashboard/MyLibraryPage'))
const BillingPage = lazy(() => import('./pages/dashboard/BillingPage'))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ThinkRailFixturePage = lazy(() => import('./pages/dev/ThinkRailFixturePage'))
const AdminHomePage = lazy(() => import('./pages/admin/AdminHomePage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const StatsPage = lazy(() => import('./pages/admin/StatsPage'))
const CrawlerPage = lazy(() => import('./pages/admin/CrawlerPage'))
const CatalogPage = lazy(() => import('./pages/admin/CatalogPage'))
const PlansPage = lazy(() => import('./pages/admin/PlansPage'))
const RevenuePage = lazy(() => import('./pages/admin/RevenuePage'))
const SiteContentPage = lazy(() => import('./pages/admin/SiteContentPage'))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'))
const SystemSettingsPage = lazy(() => import('./pages/admin/SystemSettingsPage'))

function isAppShellRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/editor')
  )
}

function AppRouteTree() {
  const location = useLocation()

  return (
    <RouteErrorBoundary>
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<Navigate to="/guide" replace />} />
        <Route path="/testimonials" element={<Navigate to="/about" replace />} />
        <Route path="/privacy" element={<GenericContentPage contentKey="privacy" fallbackTitle="隐私政策" />} />
        <Route path="/terms" element={<GenericContentPage contentKey="terms" fallbackTitle="用户协议" />} />
        <Route path="/contact" element={<GenericContentPage contentKey="contact" fallbackTitle="联系我们" />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/dev/think-rail-fixture" element={<ThinkRailFixturePage />} />

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
          <Route path="bookstore" element={<BookstorePage />} />
          <Route path="my-library" element={<MyLibraryPage />} />
          <Route path="billing" element={<BillingPage />} />
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
          <Route path="plans" element={<PlansPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="site-content" element={<SiteContentPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="system-settings" element={<SystemSettingsPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="crawler" element={<CrawlerPage />} />
          <Route path="catalog" element={<CatalogPage />} />
        </Route>
      </Routes>
    </RouteErrorBoundary>
  )
}

function AppRoutes() {
  const location = useLocation()
  useAppSessionRestore()

  const routeTree = (
    <Suspense fallback={<RouteSuspenseFallback />}>
      <AppRouteTree />
    </Suspense>
  )

  // 管理端/仪表盘/编辑器：不做全页 fade 动画，layout 已静态导入，避免 AnimatePresence 白屏
  if (isAppShellRoute(location.pathname)) {
    return routeTree
  }

  return (
    <AnimatePresence mode="sync">
      <PageTransition key={location.pathname}>{routeTree}</PageTransition>
    </AnimatePresence>
  )
}

function App() {
  useEffect(() => {
    migrateLegacyAuthStorage()
    initializeTheme()
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
    <>
      <AppToastHost />
      <ConfirmDialogHost />
      <BrowserRouter>
        <RouteProgressBar />
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
