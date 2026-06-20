import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() => import('./novels/NovelsPageDesktop').then((m) => ({ default: m.NovelsPageDesktop })))
const Mobile = lazy(() => import('./novels/NovelsPageMobile').then((m) => ({ default: m.NovelsPageMobile })))

export default function NovelsPage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
