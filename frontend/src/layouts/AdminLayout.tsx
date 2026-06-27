import { useEffect, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { fetchUserInfo } from '../api/userApi'
import { AdminSidebar } from '../components/admin/AdminSidebar'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { MobileAdminDrawer } from '../components/admin/MobileAdminDrawer'
import { AppShellHeader } from '../components/layout/AppShellHeader'
import { AppShellMain } from '../components/layout/AppShellMain'
import { LayoutOutletSkeleton } from '../components/loading/LayoutOutletSkeleton'
import { AppShellToolbar } from '../components/layout/AppShellToolbar'
import { useUserStore } from '../stores/userStore'

export default function AdminLayout() {
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

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 md:block">
        <AdminSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppShellHeader
          leading={<MobileAdminDrawer />}
          actions={<AppShellToolbar />}
        />
        <AppShellMain>
          <AdminPageHeader />
          <Suspense fallback={<LayoutOutletSkeleton />}>
            <Outlet />
          </Suspense>
        </AppShellMain>
      </div>
    </div>
  )
}
