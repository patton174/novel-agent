import { Navigate, useLocation } from 'react-router-dom'
import { BrandLoader } from '@/components/loading/BrandLoader'
import { buildLoginHref, buildReturnPath } from '@/lib/authRedirect'
import { useAuthReady } from '../../security/useAuthReady'
import { isLoggedIn } from '../../utils/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const authReady = useAuthReady()
  const location = useLocation()
  if (!authReady) {
    return <BrandLoader label="正在验证登录状态" fullScreen />
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
