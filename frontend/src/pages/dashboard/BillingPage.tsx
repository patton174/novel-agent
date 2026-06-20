import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() =>
  import('./billing/BillingDesktop').then((m) => ({ default: m.BillingDesktop })),
)
const Mobile = lazy(() =>
  import('./billing/BillingMobile').then((m) => ({ default: m.BillingMobile })),
)

export default function BillingPage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
