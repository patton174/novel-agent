import { lazy, Suspense } from 'react'
import { InstantShell } from '@/components/loading/InstantShell'

const LayoutOutletFallback = lazy(() => import('@/components/loading/LayoutOutletFallback'))

/** Layout Outlet Suspense：InstantShell（主包）→ 路由专属内容骨架（route-shells chunk） */
export function LayoutOutletSuspenseFallback() {
  return (
    <Suspense fallback={<InstantShell variant="content" />}>
      <LayoutOutletFallback />
    </Suspense>
  )
}
