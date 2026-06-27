import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AdminShellSkeleton,
  AuthPageSkeleton,
  BrandLoaderLite,
  DashboardShellSkeleton,
  MarketingPageSkeleton,
} from '@/components/loading/PageSkeletons'

/** 独立 route-shells chunk，勿在主包静态 import */
export default function RouteFallbackShell() {
  const { t } = useTranslation('common')
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
    return <BrandLoaderLite label={t('loading.openingEditor')} />
  }
  if (
    pathname === '/' ||
    pathname.startsWith('/guide') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/pricing')
  ) {
    return <MarketingPageSkeleton />
  }

  return <BrandLoaderLite label={t('loading.page')} />
}
