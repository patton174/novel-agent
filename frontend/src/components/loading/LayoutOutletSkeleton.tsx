import { useLocation } from 'react-router-dom'
import { InstantShell } from '@/components/loading/InstantShell'
import { hasRouteBeenSeen } from '@/utils/seenRoutes'
import {
  AdminCatalogContentSkeleton,
  AdminContentSkeleton,
  AdminCrawlerContentSkeleton,
  AdminStatsContentSkeleton,
  AdminTableContentSkeleton,
  BillingContentSkeleton,
  BookstoreContentSkeleton,
  DashboardHomeContentSkeleton,
  NovelsGridContentSkeleton,
  SettingsContentSkeleton,
} from '@/components/loading/PageSkeletons'

/** Layout Outlet 内容区骨架（主包同步，避免 lazy→Suspense→白屏） */
export function LayoutOutletSkeleton() {
  const { pathname } = useLocation()

  if (hasRouteBeenSeen(pathname)) {
    return <InstantShell variant="content" />
  }

  if (pathname.startsWith('/admin/users')) {
    return <AdminTableContentSkeleton />
  }
  if (pathname.startsWith('/admin/products') || pathname.startsWith('/admin/plans') || pathname.startsWith('/admin/payment-orders')) {
    return <AdminTableContentSkeleton />
  }
  if (pathname.startsWith('/admin/revenue') || pathname.startsWith('/admin/stats')) {
    return <AdminStatsContentSkeleton />
  }
  if (pathname.startsWith('/admin/site-content') || pathname.startsWith('/admin/audit-log') || pathname.startsWith('/admin/system-settings')) {
    return <AdminTableContentSkeleton />
  }
  if (pathname.startsWith('/admin/crawler')) {
    return <AdminCrawlerContentSkeleton />
  }
  if (pathname.startsWith('/admin/catalog')) {
    return <AdminCatalogContentSkeleton />
  }
  if (pathname.startsWith('/admin')) {
    return <AdminContentSkeleton />
  }

  if (pathname.startsWith('/dashboard/novels')) {
    return <NovelsGridContentSkeleton />
  }
  if (pathname.startsWith('/dashboard/bookstore')) {
    return <BookstoreContentSkeleton />
  }
  if (pathname.startsWith('/dashboard/billing')) {
    return <BillingContentSkeleton />
  }
  if (pathname.startsWith('/dashboard/settings')) {
    return <SettingsContentSkeleton />
  }
  if (pathname.startsWith('/dashboard')) {
    return <DashboardHomeContentSkeleton />
  }

  return <AdminContentSkeleton />
}
