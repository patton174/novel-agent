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
import { useUserStore } from '../stores/userStore'

export default function AdminLayout() {
  const { t } = useTranslation(['common'])
  const location = useLocation()
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

  const PAGE_META: Record<string, { title: string; description?: string }> = {
    '/admin': { title: t('layout.admin.overviewTitle'), description: t('layout.admin.overviewDesc') },
    '/admin/users': { title: t('layout.admin.usersTitle'), description: t('layout.admin.usersDesc') },
    '/admin/plans': { title: t('layout.admin.plansTitle'), description: t('layout.admin.plansDesc') },
    '/admin/models': { title: t('layout.admin.modelsTitle'), description: t('layout.admin.modelsDesc') },
    '/admin/revenue': { title: t('layout.admin.revenueTitle'), description: t('layout.admin.revenueDesc') },
    '/admin/site-content': { title: t('layout.admin.siteContentTitle'), description: t('layout.admin.siteContentDesc') },
    '/admin/audit-log': { title: t('layout.admin.auditLogTitle'), description: t('layout.admin.auditLogDesc') },
    '/admin/system-settings': { title: t('layout.admin.systemSettingsTitle'), description: t('layout.admin.systemSettingsDesc') },
    '/admin/stats': { title: t('layout.admin.statsTitle'), description: t('layout.admin.statsDesc') },
    '/admin/crawler': { title: t('layout.admin.crawlerTitle'), description: t('layout.admin.crawlerDesc') },
    '/admin/catalog': { title: t('layout.admin.catalogTitle'), description: t('layout.admin.catalogDesc') },
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
              className="mb-4"
              items={[
                { label: t('common:nav.adminTitle'), to: '/admin' },
                { label: meta.title },
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
