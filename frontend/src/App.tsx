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
import { startSessionBootstrap } from './security/sessionBootstrap'
import { useUserStore } from './stores/userStore'
import { useAppSessionRestore } from './hooks/useAppSessionRestore'
import { useReferralCapture } from './hooks/useReferralCapture'
import { useDocumentMeta } from './hooks/useDocumentMeta'
import { PageTransition } from './components/PageTransition'
import { initializeTheme } from './stores/themeStore'
import { TurnstileChallengeGate } from './components/auth/TurnstileChallengeGate'
import { FEATURE_AGENT_CREW, FEATURE_AGENT_SKILLS } from './config/features'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const PayCheckoutPage = lazy(() => import('./pages/PayCheckoutPage'))
const GuidePage = lazy(() => import('./pages/GuidePage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const BlogListPage = lazy(() => import('./pages/BlogListPage'))
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const GenericContentPage = lazy(() => import('./pages/GenericContentPage'))
const EditorPage = lazy(() => import('./pages/EditorPage'))
const DashboardHomePage = lazy(() => import('./pages/dashboard/DashboardHomePage'))
const NovelsPage = lazy(() => import('./pages/dashboard/NovelsPage'))
const BookstorePage = lazy(() => import('./pages/dashboard/BookstorePage'))
const MyLibraryPage = lazy(() => import('./pages/dashboard/MyLibraryPage'))
const UsagePage = lazy(() => import('./pages/dashboard/UsagePage'))
const BillingPage = lazy(() => import('./pages/dashboard/BillingPage'))
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'))
const SkillsPage = lazy(() => import('./pages/dashboard/skills/SkillsPage'))
const ProfileManagementPage = lazy(() => import('./pages/dashboard/agent/ProfileManagementPage'))
const CrewTemplateAdminPage = lazy(() => import('./pages/admin/CrewTemplateAdminPage'))
const AdminAgentSkillsPage = lazy(() => import('./pages/admin/AdminAgentSkillsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ThinkRailFixturePage = lazy(() => import('./pages/dev/ThinkRailFixturePage'))
const AdminHomePage = lazy(() => import('./pages/admin/AdminHomePage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const CatalogPage = lazy(() => import('./pages/admin/CatalogPage'))
const PlansPage = lazy(() => import('./pages/admin/PlansPage'))
const PaymentOrdersPage = lazy(() => import('./pages/admin/PaymentOrdersPage'))
const PaymentProductsPage = lazy(() => import('./pages/admin/PaymentProductsPage'))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'))
const SystemSettingsPage = lazy(() => import('./pages/admin/SystemSettingsPage'))
const AdminModelsPage = lazy(() => import('./pages/admin/AdminModelsPage'))
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'))
const SystemMonitoringPage = lazy(() => import('./pages/admin/SystemMonitoringPage'))
const AdminUserRolesPage = lazy(() => import('./pages/admin/UserRolesPage'))
const AdminUserPermissionsPage = lazy(() => import('./pages/admin/UserPermissionsPage'))
const AdminUserMembershipPage = lazy(() => import('./pages/admin/UserMembershipPage'))
const AdminSystemJobsPage = lazy(() => import('./pages/admin/SystemJobsPage'))
const AdminUploadOpsPage = lazy(() => import('./pages/admin/UploadOpsPage'))
const NotificationBroadcastPage = lazy(() => import('./pages/admin/NotificationBroadcastPage'))
const AdminReferralStatsPage = lazy(() => import('./pages/admin/ReferralStatsPage'))
const InviteCodesPage = lazy(() => import('./pages/admin/InviteCodesPage'))
const GiftCampaignsPage = lazy(() => import('./pages/admin/GiftCampaignsPage'))
const AdminBillingPage = lazy(() => import('./pages/admin/AdminBillingPage'))
const AdminLegalContentPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminLegalContentPage })),
)
const AdminAnnouncementsContentPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminAnnouncementsContentPage })),
)
const AdminSitePagesContentPage = lazy(() =>
  import('./pages/admin/AdminContentPages').then((m) => ({ default: m.AdminSitePagesContentPage })),
)

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
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/vs/wawa-writing" element={<Navigate to="/compare#compare-wawa" replace />} />
        <Route path="/vs/waqu-pinwen" element={<Navigate to="/compare#compare-waqu" replace />} />
        <Route path="/compare/wawa-writing" element={<Navigate to="/compare#compare-wawa" replace />} />
        <Route path="/compare/waqu-pinwen" element={<Navigate to="/compare#compare-waqu" replace />} />
        <Route path="/compare/yuewen" element={<Navigate to="/compare#compare-yuewen" replace />} />
        <Route path="/ai-novel-writing-tools" element={<Navigate to="/compare" replace />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/checkout" element={<PayCheckoutPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogListPage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/features" element={<Navigate to="/guide" replace />} />
        <Route path="/testimonials" element={<Navigate to="/about" replace />} />
        <Route path="/privacy" element={<GenericContentPage contentKey="privacy" />} />
        <Route path="/terms" element={<GenericContentPage contentKey="terms" />} />
        <Route path="/contact" element={<GenericContentPage contentKey="contact" />} />

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
          {FEATURE_AGENT_SKILLS ? <Route path="skills" element={<SkillsPage />} /> : null}
          <Route path="agent/profiles" element={<ProfileManagementPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="usage" element={<UsagePage />} />
          <Route path="settings" element={<Navigate to="/dashboard/settings/profile" replace />} />
          <Route path="settings/:section" element={<SettingsPage />} />
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
          <Route path="analytics" element={<Navigate to="/admin/analytics/platform" replace />} />
          <Route path="analytics/:section" element={<AdminAnalyticsPage />} />
          <Route path="billing" element={<Navigate to="/admin/billing/cdk" replace />} />
          <Route path="billing/:section" element={<AdminBillingPage />} />
          <Route path="billing/plans" element={<PlansPage />} />
          <Route path="billing/payment" element={<PaymentProductsPage view="all" />} />
          <Route path="billing/orders" element={<PaymentOrdersPage />} />
          <Route path="billing/referrals" element={<AdminReferralStatsPage />} />
          <Route path="billing/gift-campaigns" element={<GiftCampaignsPage />} />
          <Route path="billing/platform" element={<Navigate to="/admin/billing/payment" replace />} />
          <Route path="billing/products" element={<Navigate to="/admin/billing/payment" replace />} />
          <Route path="billing/inventory" element={<Navigate to="/admin/billing/payment" replace />} />
          <Route path="billing/pricing" element={<Navigate to="/admin/billing/payment" replace />} />
          <Route path="billing/coupons" element={<Navigate to="/admin/billing/payment" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/roles" element={<AdminUserRolesPage />} />
          <Route path="users/permissions" element={<AdminUserPermissionsPage />} />
          <Route path="users/membership" element={<AdminUserMembershipPage />} />
          <Route path="users/invite-codes" element={<InviteCodesPage />} />
          <Route path="content/legal" element={<AdminLegalContentPage />} />
          <Route path="content/announcements" element={<AdminAnnouncementsContentPage />} />
          <Route path="notification" element={<NotificationBroadcastPage />} />
          <Route path="content/pages" element={<AdminSitePagesContentPage />} />
          <Route path="content/catalog" element={<CatalogPage />} />
          <Route path="content/uploads" element={<AdminUploadOpsPage />} />
          <Route path="system/models" element={<AdminModelsPage />} />
          {FEATURE_AGENT_SKILLS ? (
            <Route path="system/agent-skills" element={<AdminAgentSkillsPage />} />
          ) : null}
          {FEATURE_AGENT_CREW ? <Route path="system/crews" element={<CrewTemplateAdminPage />} /> : null}
          <Route path="system/monitoring" element={<SystemMonitoringPage />} />
          <Route path="system/jobs" element={<AdminSystemJobsPage />} />
          <Route path="system/settings" element={<SystemSettingsPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          {/* Legacy redirects */}
          <Route path="stats" element={<Navigate to="/admin/analytics/platform" replace />} />
          <Route path="revenue" element={<Navigate to="/admin/analytics/revenue" replace />} />
          <Route path="products" element={<Navigate to="/admin/billing/payment" replace />} />
          <Route path="plans" element={<Navigate to="/admin/billing/plans" replace />} />
          <Route path="payment-orders" element={<Navigate to="/admin/billing/orders" replace />} />
          <Route path="site-content" element={<Navigate to="/admin/content/legal" replace />} />
          <Route path="content/site" element={<Navigate to="/admin/content/legal" replace />} />
          <Route path="catalog" element={<Navigate to="/admin/content/catalog" replace />} />
          <Route path="models" element={<Navigate to="/admin/system/models" replace />} />
          <Route path="system-settings" element={<Navigate to="/admin/system/settings" replace />} />
        </Route>
      </Routes>
    </RouteErrorBoundary>
  )
}

function AppRoutes() {
  const location = useLocation()
  useAppSessionRestore()
  useReferralCapture()
  useDocumentMeta()

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
      <TurnstileChallengeGate />
      <BrowserRouter>
        <RouteProgressBar />
        <AppRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
