import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BrandLoader } from '@/components/loading/BrandLoader'
import { buildLoginHref, buildReturnPath } from '@/lib/authRedirect'
import { useAuthReady } from '../../security/useAuthReady'
import { isLoggedIn } from '../../utils/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common')
  const authReady = useAuthReady()
  const location = useLocation()
  if (!authReady) {
    return <BrandLoader label={t('loading.verifyingAuth')} fullScreen />
  }
  if (!isLoggedIn()) {
    return (
      <Navigate
        to={buildLoginHref({ returnPath: buildReturnPath(location) })}
        replace
      />
    )
  }
  return <>{children}</>
}
