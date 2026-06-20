import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() =>
  import('./my-library/MyLibraryDesktop').then((m) => ({ default: m.MyLibraryDesktop })),
)
const Mobile = lazy(() =>
  import('./my-library/MyLibraryMobile').then((m) => ({ default: m.MyLibraryMobile })),
)

export default function MyLibraryPage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
