import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() =>
  import('./bookstore/BookstoreDesktop').then((m) => ({ default: m.BookstoreDesktop })),
)
const Mobile = lazy(() =>
  import('./bookstore/BookstoreMobile').then((m) => ({ default: m.BookstoreMobile })),
)

export default function BookstorePage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
