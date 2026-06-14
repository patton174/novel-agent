import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { fetchUserInfo } from '@/api/userApi'
import { AccountSettingsSections } from '@/components/dashboard/AccountSettingsSections'
import {
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useUserStore } from '@/stores/userStore'
import type { UserProfile } from '@/stores/userStore'

export default function SettingsPage() {
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

  return (
    <AppPageStack compact>
      <AppPageIntro
        eyebrow="账户"
        title={loading ? <InlineTitleSkeleton /> : profile?.username ?? '账户设置'}
        icon={Settings}
      />

      <AppShellCard>
        <AppShellCardHeader title="账户与账单" description="邮箱验证、基本资料与用量账单" />
        <AppShellCardBody>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <AccountSettingsSections
              profile={profile}
              onVerified={() => {
                void fetchUserInfo().then((user) => {
                  setLocalProfile(user)
                  setProfile(user)
                })
              }}
              variant="page"
            />
          )}
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
