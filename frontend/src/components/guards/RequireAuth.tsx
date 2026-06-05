import { Navigate, useLocation } from 'react-router-dom'
import { useAuthReady } from '../../security/useAuthReady'
import { isLoggedIn } from '../../utils/auth'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const authReady = useAuthReady()
  const location = useLocation()
  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        加载中…
      </div>
    )
  }
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}
