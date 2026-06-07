import { lazy, Suspense } from 'react'
import { InstantShell } from '@/components/loading/InstantShell'

const RouteFallbackShell = lazy(() => import('@/components/loading/RouteFallbackShell'))

/** 路由级 Suspense fallback：InstantShell（主包）→ RouteFallbackShell（route-shells chunk） */
export function RouteSuspenseFallback() {
  return (
    <Suspense fallback={<InstantShell />}>
      <RouteFallbackShell />
    </Suspense>
  )
}
