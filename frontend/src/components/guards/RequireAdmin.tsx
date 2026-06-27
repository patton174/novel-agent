import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLoader } from '@/components/loading/BrandLoader'
import { fetchUserInfo } from '../../api/userApi'
import { useUserStore } from '../../stores/userStore'
import { RequireAuth } from './RequireAuth'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const [profileReady, setProfileReady] = useState(Boolean(profile))

  useEffect(() => {
    if (profile) {
      setProfileReady(true)
      if (profile.role === 'admin') {
        void import('../../pages/admin/AdminHomePage')
        void import('../../pages/admin/UsersPage')
        void import('../../pages/admin/CatalogPage')
      }
      return
    }
    let cancelled = false
    void fetchUserInfo()
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
          setProfileReady(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [profile, setProfile])

  return (
    <RequireAuth>
      {!profileReady ? (
        <BrandLoader label={t('loading.adminPermissions')} fullScreen />
      ) : profile?.role === 'admin' ? (
        children
      ) : (
        <Navigate to="/dashboard" replace />
      )}
    </RequireAuth>
  )
}
