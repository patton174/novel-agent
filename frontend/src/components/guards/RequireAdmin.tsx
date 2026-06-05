import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { fetchUserInfo } from '../../api/userApi'
import { useUserStore } from '../../stores/userStore'
import { RequireAuth } from './RequireAuth'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const [profileReady, setProfileReady] = useState(Boolean(profile))

  useEffect(() => {
    if (profile) {
      setProfileReady(true)
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
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            color: '#888',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          加载中…
        </div>
      ) : profile?.role === 'admin' ? (
        children
      ) : (
        <Navigate to="/dashboard" replace />
      )}
    </RequireAuth>
  )
}
