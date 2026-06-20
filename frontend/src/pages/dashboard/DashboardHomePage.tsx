import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() => import('./home/DashboardHomeDesktop').then((m) => ({ default: m.DashboardHomeDesktop })))
const Mobile = lazy(() => import('./home/DashboardHomeMobile').then((m) => ({ default: m.DashboardHomeMobile })))

export default function DashboardHomePage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
