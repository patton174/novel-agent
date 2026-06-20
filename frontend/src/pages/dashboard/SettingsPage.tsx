import { lazy, Suspense } from 'react'
import { useIsDesktop } from '@/components/pro/useIsDesktop'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'

const Desktop = lazy(() =>
  import('./settings/SettingsDesktop').then((m) => ({ default: m.SettingsDesktop })),
)
const Mobile = lazy(() =>
  import('./settings/SettingsMobile').then((m) => ({ default: m.SettingsMobile })),
)

export default function SettingsPage() {
  const isDesktop = useIsDesktop()
  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      {isDesktop ? <Desktop /> : <Mobile />}
    </Suspense>
  )
}
