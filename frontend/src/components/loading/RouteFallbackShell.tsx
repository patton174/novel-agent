import { useLocation } from 'react-router-dom'
import {
  AdminShellSkeleton,
  AuthPageSkeleton,
  BrandLoaderLite,
  DashboardShellSkeleton,
  MarketingPageSkeleton,
} from '@/components/loading/PageSkeletons'

/** 独立 route-shells chunk，勿在主包静态 import */
export default function RouteFallbackShell() {
  const { pathname } = useLocation()

  if (pathname.startsWith('/admin')) {
    return <AdminShellSkeleton />
  }
  if (pathname.startsWith('/dashboard')) {
    return <DashboardShellSkeleton />
  }
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/verify-email')
  ) {
    return <AuthPageSkeleton />
  }
  if (pathname.startsWith('/editor')) {
    return <BrandLoaderLite label="正在打开编辑器" />
  }
  if (pathname === '/' || pathname.startsWith('/features') || pathname.startsWith('/pricing')) {
    return <MarketingPageSkeleton />
  }

  return <BrandLoaderLite label="正在加载页面" />
}
