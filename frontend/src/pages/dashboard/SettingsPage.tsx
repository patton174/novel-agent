import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Settings } from 'lucide-react'
import { fetchUserInfo } from '@/api/userApi'
import { AccountSettingsPanel } from '@/components/dashboard/AccountSettingsPanel'
import {
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { APP_BTN_FULL_MD } from '@/lib/appButtonTokens'
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
    <AppPageStack narrow>
      <AppPageIntro
        eyebrow="账户"
        title={loading ? <InlineTitleSkeleton /> : profile?.username ?? '账户设置'}
        icon={Settings}
      />

      <AppShellCard>
        <AppShellCardHeader title="账户信息" description="邮箱验证与基本资料" />
        <AppShellCardBody>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <AccountSettingsPanel
              profile={profile}
              onVerified={() => {
                void fetchUserInfo().then((user) => {
                  setLocalProfile(user)
                  setProfile(user)
                })
              }}
            />
          )}
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader
          title="账单与升级"
          description="用量明细、套餐与预估费用请前往账单页查看"
        />
        <AppShellCardBody>
          <Button asChild className={APP_BTN_FULL_MD}>
            <Link to="/dashboard/billing">
              <CreditCard className="mr-2 size-4" />
              打开账单页
            </Link>
          </Button>
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
