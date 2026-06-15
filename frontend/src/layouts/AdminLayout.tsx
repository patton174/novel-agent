import { useEffect, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchUserInfo } from '../api/userApi'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { MobileAdminDrawer } from '../components/admin/MobileAdminDrawer'
import { AppShellHeader } from '../components/layout/AppShellHeader'
import { AppShellMain } from '../components/layout/AppShellMain'
import { LayoutOutletSkeleton } from '../components/loading/LayoutOutletSkeleton'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { AppShellToolbar } from '../components/layout/AppShellToolbar'
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
  const initials = profile?.username?.slice(0, 2).toUpperCase() || '?'

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
          actions={
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <AppShellToolbar />
              <Button asChild variant="outline" size="icon" className="size-9 sm:hidden" aria-label={t('nav.backToUser')}>
                <Link to="/dashboard">
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="hidden h-9 sm:inline-flex">
                <Link to="/dashboard">
                  <ArrowLeft className="size-4" />
                  {t('nav.backToUser')}
                </Link>
              </Button>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {t('layout.admin.adminBadge')}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="hidden max-w-[8rem] truncate text-sm text-muted-foreground md:inline">
                  {profile?.username || t('layout.admin.adminBadge')}
                </span>
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          }
        />
        <AppShellMain>
          <Suspense fallback={<LayoutOutletSkeleton />}>
            <Outlet />
          </Suspense>
        </AppShellMain>
      </div>
    </div>
  )
}
