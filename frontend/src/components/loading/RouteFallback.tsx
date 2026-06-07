import { useLocation } from 'react-router-dom'
import { BrandLoader } from '@/components/loading/BrandLoader'
import {
  AdminShellSkeleton,
  AuthPageSkeleton,
  DashboardShellSkeleton,
  MarketingPageSkeleton,
} from '@/components/loading/PageSkeletons'

export function RouteFallback() {
  const { pathname } = useLocation()

  if (pathname.startsWith('/admin')) {
    return <AdminShellSkeleton />
  }
  if (pathname.startsWith('/dashboard')) {
    return <DashboardShellSkeleton />
  }
  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/verify-email')) {
    return <AuthPageSkeleton />
  }
  if (pathname.startsWith('/editor')) {
    return <BrandLoader label="正在打开编辑器" className="min-h-screen" />
  }
  if (pathname === '/' || pathname.startsWith('/features') || pathname.startsWith('/pricing')) {
    return <MarketingPageSkeleton />
  }

  return <BrandLoader label="正在加载页面" className="min-h-screen" />
}
