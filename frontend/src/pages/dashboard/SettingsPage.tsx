import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSubscription, fetchUsageCurrent, formatTokenCount } from '@/api/billingApi'
import { fetchUserInfo } from '@/api/userApi'
import { AccountSettingsPanel } from '@/components/dashboard/AccountSettingsPanel'
import {
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { Button } from '@/components/ui/button'
import { ContentPending } from '@/components/loading/ContentPending'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useUserStore } from '@/stores/userStore'
import type { UserProfile } from '@/stores/userStore'

export default function SettingsPage() {
  useMarkRouteSeen()
  const setProfile = useUserStore((s) => s.setProfile)
  const [profile, setLocalProfile] = useState<UserProfile | null>(null)
  const [planName, setPlanName] = useState<string | null>(null)
  const [tokenSummary, setTokenSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchUserInfo(), fetchSubscription(), fetchUsageCurrent()])
      .then(([user, sub, usage]) => {
        if (cancelled) return
        setLocalProfile(user)
        setProfile(user)
        setPlanName(sub?.planName ?? usage.planName)
        setTokenSummary(
          `${formatTokenCount(usage.tokensUsed)}${
            usage.tokenQuota != null ? ` / ${formatTokenCount(usage.tokenQuota)}` : ''
          }`,
        )
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

  if (loading) {
    return <ContentPending label="加载账户设置…" />
  }

  return (
    <AppPageStack narrow>
      <AppShellCard>
        <AppShellCardHeader title="账户信息" description="邮箱验证与基本资料" />
        <AppShellCardBody>
          <AccountSettingsPanel
            profile={profile}
            onVerified={() => {
              void fetchUserInfo().then((user) => {
                setLocalProfile(user)
                setProfile(user)
              })
            }}
          />
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader title="订阅与用量" description="当前套餐与本月 Token 使用情况" />
        <AppShellCardBody className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">当前套餐</span>
            <span className="font-medium">{planName ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">本月 Tokens</span>
            <span className="font-medium tabular-nums">{tokenSummary ?? '—'}</span>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/dashboard/billing">查看账单与升级</Link>
          </Button>
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
