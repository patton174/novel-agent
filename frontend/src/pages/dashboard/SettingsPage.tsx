import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchSubscription, fetchUsageCurrent, formatTokenCount } from '@/api/billingApi'
import { fetchUserInfo } from '@/api/userApi'
import { AccountSettingsPanel } from '@/components/dashboard/AccountSettingsPanel'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className="py-0 shadow-none">
        <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
          <CardTitle className="text-base font-semibold">账户信息</CardTitle>
          <CardDescription>邮箱验证与基本资料</CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <AccountSettingsPanel
            profile={profile}
            onVerified={() => {
              void fetchUserInfo().then((user) => {
                setLocalProfile(user)
                setProfile(user)
              })
            }}
          />
        </CardContent>
      </Card>

      <Card className="py-0 shadow-none">
        <CardHeader className="border-b px-6 py-5 [.border-b]:pb-5">
          <CardTitle className="text-base font-semibold">订阅与用量</CardTitle>
          <CardDescription>当前套餐与本月 Token 使用情况</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-6 py-5">
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">当前套餐</span>
            <span className="font-medium">{planName ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">本月 Tokens</span>
            <span className="font-medium tabular-nums">{tokenSummary ?? '—'}</span>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/dashboard/billing">查看账单与升级</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
