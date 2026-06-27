import { useEffect, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { AppSidebar } from '../components/dashboard/AppSidebar'
import { DashboardAnnouncementBanner } from '../components/dashboard/DashboardAnnouncementBanner'
import { DashboardQuickActions } from '../components/dashboard/DashboardQuickActions'
import { AppShellHeader } from '../components/layout/AppShellHeader'
import { AppShellMain } from '../components/layout/AppShellMain'
import { LayoutOutletSkeleton } from '../components/loading/LayoutOutletSkeleton'
import { ProTabBar } from '@/components/pro/ProTabBar'
import { ProIconAccount, ProIconLibrary, ProIconNovel, ProIconOverview } from '@/components/pro/icons/proIcons'
import { syncPixelAvatarForUser } from '@/stores/pixelAvatarStore'
import { useUserStore } from '../stores/userStore'
import { useTranslation } from 'react-i18next'

export default function DashboardLayout() {
  const { t } = useTranslation(['common'])
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

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

  const mobileTabs = [
    { label: t('common:nav.tabHome'), to: '/dashboard', icon: ProIconOverview, end: true },
    { label: t('common:nav.tabNovels'), to: '/dashboard/novels', icon: ProIconNovel },
    { label: t('common:nav.tabLibrary'), to: '/dashboard/my-library', icon: ProIconLibrary },
    { label: t('common:nav.tabMine'), to: '/dashboard/settings/profile', icon: ProIconAccount },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppShellHeader actions={<DashboardQuickActions />} />
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
