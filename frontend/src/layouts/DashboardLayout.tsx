import { useEffect, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { AppSidebar } from '../components/dashboard/AppSidebar'
import { DashboardAnnouncementBanner } from '../components/dashboard/DashboardAnnouncementBanner'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardQuickActions } from '../components/dashboard/DashboardQuickActions'
import { AppShellMain } from '../components/layout/AppShellMain'
import { LayoutOutletSkeleton } from '../components/loading/LayoutOutletSkeleton'
import { ProTabBar } from '@/components/pro/ProTabBar'
import { ProIconAccount, ProIconLibrary, ProIconNovel, ProIconOverview } from '@/components/pro/icons/proIcons'
import { syncPixelAvatarForUser } from '@/stores/pixelAvatarStore'
import { useUserStore } from '../stores/userStore'

export default function DashboardLayout() {
  const { t } = useTranslation(['common'])
  const location = useLocation()
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

  const PAGE_META: Record<string, { title: string; description?: string }> = {
    '/dashboard': { title: t('layout.dashboard.overviewTitle'), description: t('layout.dashboard.overviewDesc') },
    '/dashboard/novels': { title: t('layout.dashboard.novelsTitle'), description: t('layout.dashboard.novelsDesc') },
    '/dashboard/bookstore': { title: t('layout.dashboard.bookstoreTitle'), description: t('layout.dashboard.bookstoreDesc') },
    '/dashboard/my-library': { title: t('layout.dashboard.myLibraryTitle'), description: t('layout.dashboard.myLibraryDesc') },
    '/dashboard/billing': { title: t('layout.dashboard.billingTitle'), description: t('layout.dashboard.billingDesc') },
    '/dashboard/settings': { title: t('layout.dashboard.settingsTitle'), description: t('layout.dashboard.settingsDesc') },
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
          void syncPixelAvatarForUser(p.userId)
        }
      })
      .catch(() => {
        /* profile optional for layout shell */
      })
    return () => {
      cancelled = true
    }
  }, [profile, setProfile])

  const meta = PAGE_META[location.pathname] ?? { title: t('layout.dashboard.defaultTitle') }

  // 手机底部 tabbar：概览 / 小说 / 书库 / 我的
  const mobileTabs = [
    { label: t('common:nav.tabHome'), to: '/dashboard', icon: ProIconOverview, end: true },
    { label: t('common:nav.tabNovels'), to: '/dashboard/novels', icon: ProIconNovel },
    { label: t('common:nav.tabLibrary'), to: '/dashboard/my-library', icon: ProIconLibrary },
    { label: t('common:nav.tabMine'), to: '/dashboard/settings', icon: ProIconAccount },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={meta.title}
          description={meta.description}
          actions={<DashboardQuickActions />}
        />
        <DashboardAnnouncementBanner />
        <AppShellMain className="pb-16 md:pb-0">
          <Suspense fallback={<LayoutOutletSkeleton />}>
            <Outlet />
          </Suspense>
        </AppShellMain>
      </div>
      <ProTabBar items={mobileTabs} />
    </div>
  )
}
