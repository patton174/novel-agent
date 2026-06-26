import { useEffect, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { MobileAdminDrawer } from '../components/admin/MobileAdminDrawer'
import { AppShellHeader } from '../components/layout/AppShellHeader'
import { AppShellMain } from '../components/layout/AppShellMain'
import { LayoutOutletSkeleton } from '../components/loading/LayoutOutletSkeleton'
import { AppShellToolbar } from '../components/layout/AppShellToolbar'
import { ProBreadcrumb } from '@/components/pro/ProBreadcrumb'
import { buildAdminBreadcrumbSegments } from '@/config/adminBreadcrumb'
import { useUserStore } from '../stores/userStore'

export default function AdminLayout() {
  const { t } = useTranslation(['common'])
  const location = useLocation()
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

  const PAGE_META: Record<string, { title: string; description?: string }> = {
    '/admin': { title: t('layout.admin.overviewTitle'), description: t('layout.admin.overviewDesc') },
    '/admin/analytics': { title: t('layout.admin.analyticsTitle'), description: t('layout.admin.analyticsDesc') },
    '/admin/billing/plans': { title: t('layout.admin.plansTitle'), description: t('layout.admin.plansDesc') },
    '/admin/billing/payment': {
      title: t('layout.admin.billingPaymentTitle'),
      description: t('layout.admin.billingPaymentDesc'),
    },
    '/admin/billing/orders': {
      title: t('layout.admin.paymentOrdersTitle'),
      description: t('layout.admin.paymentOrdersDesc'),
    },
    '/admin/users': { title: t('layout.admin.usersTitle'), description: t('layout.admin.usersDesc') },
    '/admin/users/roles': { title: t('layout.admin.userRolesTitle'), description: t('layout.admin.userRolesDesc') },
    '/admin/users/permissions': {
      title: t('layout.admin.userPermissionsTitle'),
      description: t('layout.admin.userPermissionsDesc'),
    },
    '/admin/users/membership': {
      title: t('layout.admin.userMembershipTitle'),
      description: t('layout.admin.userMembershipDesc'),
    },
    '/admin/audit-log': { title: t('layout.admin.auditLogTitle'), description: t('layout.admin.auditLogDesc') },
    '/admin/content/legal': { title: t('layout.admin.contentLegalTitle'), description: t('layout.admin.contentLegalDesc') },
    '/admin/content/announcements': {
      title: t('layout.admin.contentAnnouncementsTitle'),
      description: t('layout.admin.contentAnnouncementsDesc'),
    },
    '/admin/content/pages': { title: t('layout.admin.contentPagesTitle'), description: t('layout.admin.contentPagesDesc') },
    '/admin/content/crawler': { title: t('layout.admin.crawlerTitle'), description: t('layout.admin.crawlerDesc') },
    '/admin/content/catalog': { title: t('layout.admin.catalogTitle'), description: t('layout.admin.catalogDesc') },
    '/admin/content/uploads': { title: t('layout.admin.uploadOpsTitle'), description: t('layout.admin.uploadOpsDesc') },
    '/admin/system/models': { title: t('layout.admin.modelsTitle'), description: t('layout.admin.modelsDesc') },
    '/admin/system/monitoring': {
      title: t('layout.admin.systemMonitoringTitle'),
      description: t('layout.admin.systemMonitoringDesc'),
    },
    '/admin/system/jobs': { title: t('layout.admin.systemJobsTitle'), description: t('layout.admin.systemJobsDesc') },
    '/admin/system/settings': {
      title: t('layout.admin.systemSettingsTitle'),
      description: t('layout.admin.systemSettingsDesc'),
    },
  }

  useEffect(() => {
    if (profile) {
      return
    }
    let cancelled = false
    void fetchUserInfo()
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
        }
      })
      .catch(() => {
        /* profile optional for layout shell */
      })
    return () => {
      cancelled = true
    }
  }, [profile, setProfile])

  const meta = PAGE_META[location.pathname] ?? { title: t('layout.admin.defaultTitle') }
  const breadcrumbSegments = buildAdminBreadcrumbSegments(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AdminSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppShellHeader
          title={meta.title}
          description={meta.description}
          leading={<MobileAdminDrawer />}
          actions={<AppShellToolbar />}
        />
        <AppShellMain>
          {location.pathname !== '/admin' ? (
            <ProBreadcrumb
              className="mb-2"
              items={[
                { label: t('common:nav.adminTitle'), to: '/admin' },
                ...breadcrumbSegments.map((segment, index) => ({
                  label: t(segment.labelKey),
                  to: index < breadcrumbSegments.length - 1 ? segment.to : undefined,
                })),
              ]}
            />
          ) : null}
          <Suspense fallback={<LayoutOutletSkeleton />}>
            <Outlet />
          </Suspense>
        </AppShellMain>
      </div>
    </div>
  )
}
