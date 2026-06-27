import { lazy, Suspense } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { LayoutOutletSkeleton } from '@/components/loading/LayoutOutletSkeleton'
import {
  isSettingsSection,
  SETTINGS_DEFAULT_SECTION,
} from './settings/settingsSections'

const SettingsSectionPage = lazy(() =>
  import('./settings/SettingsSectionPage').then((m) => ({ default: m.SettingsSectionPage })),
)

export default function SettingsPage() {
  const { section: sectionParam } = useParams<{ section: string }>()
  const section = isSettingsSection(sectionParam) ? sectionParam : null

  if (!section) {
    return <Navigate to={`/dashboard/settings/${SETTINGS_DEFAULT_SECTION}`} replace />
  }

  return (
    <Suspense fallback={<LayoutOutletSkeleton />}>
      <SettingsSectionPage section={section} />
    </Suspense>
  )
}
