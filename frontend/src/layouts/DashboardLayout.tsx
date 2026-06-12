import '../styles/globals.css'

import { useEffect, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { AppSidebar } from '../components/dashboard/AppSidebar'
import { DashboardAnnouncementBanner } from '../components/dashboard/DashboardAnnouncementBanner'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardQuickActions } from '../components/dashboard/DashboardQuickActions'
import { MobileSidebarDrawer } from '../components/dashboard/MobileSidebarDrawer'
import { AppShellMain } from '../components/layout/AppShellMain'
import { LayoutOutletSkeleton } from '../components/loading/LayoutOutletSkeleton'
import { useUserStore } from '../stores/userStore'

const PAGE_META: Record<string, { title: string; description?: string }> = {
  '/dashboard': { title: '概览', description: '创作数据与最近编辑' },
  '/dashboard/novels': { title: '我的小说', description: '管理你的全部作品' },
  '/dashboard/bookstore': { title: '书库', description: '浏览 AI 爬取作品并加入创作' },
  '/dashboard/billing': { title: '用量与账单', description: 'Token 用量与费用概览' },
  '/dashboard/settings': { title: '账户设置', description: '个人信息与邮箱验证' },
}

export default function DashboardLayout() {
  const location = useLocation()
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
        }
      })
      .catch(() => {
        /* profile optional for layout shell */
      })
    return () => {
      cancelled = true
    }
  }, [profile, setProfile])

  const meta = PAGE_META[location.pathname] ?? { title: '仪表盘' }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          title={meta.title}
          description={meta.description}
          leading={<MobileSidebarDrawer />}
          actions={<DashboardQuickActions />}
        />
        <DashboardAnnouncementBanner />
        <AppShellMain>
          <Suspense fallback={<LayoutOutletSkeleton />}>
            <Outlet />
          </Suspense>
        </AppShellMain>
      </div>
    </div>
  )
}
