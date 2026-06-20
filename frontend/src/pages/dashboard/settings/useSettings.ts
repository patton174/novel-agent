import { useEffect, useState } from 'react'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { fetchUserInfo } from '@/api/userApi'
import { useUserStore } from '@/stores/userStore'
import type { UserProfile } from '@/stores/userStore'

export interface UseSettingsResult {
  profile: UserProfile | null
  loading: boolean
  onVerified: () => void
}

/** 账户设置：拉取用户信息并同步到 userStore。逻辑迁自原 SettingsPage（行为保持一致）。 */
export function useSettings(): UseSettingsResult {
  useMarkRouteSeen()
  const setProfile = useUserStore((s) => s.setProfile)
  const [profile, setLocalProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchUserInfo()
      .then((user) => {
        if (cancelled) return
        setLocalProfile(user)
        setProfile(user)
      })
      .catch(() => {
        if (cancelled) return
        setLocalProfile(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setProfile])

  const onVerified = () => {
    void fetchUserInfo().then((user) => {
      setLocalProfile(user)
      setProfile(user)
    })
  }

  return { profile, loading, onVerified }
}
