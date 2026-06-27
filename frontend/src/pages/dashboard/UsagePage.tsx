import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() =>
  import('./usage/UsageDesktop').then((m) => ({ default: m.UsageDesktop })),
)
const Mobile = lazy(() =>
  import('./usage/UsageMobile').then((m) => ({ default: m.UsageMobile })),
)

export default function UsagePage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
