import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Mail } from 'lucide-react'
import { sendEmailVerifyLink, needsEmailVerification } from '@/api/userApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'
import type { UserProfile } from '@/stores/userStore'

const ROLE_LABELS: Record<string, string> = {
  user: '普通用户',
  vip: 'VIP 用户',
  admin: '管理员',
}

interface AccountSettingsPanelProps {
  profile: UserProfile | null
  onVerified?: () => void
}

export function AccountSettingsPanel({ profile, onVerified }: AccountSettingsPanelProps) {
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  if (!profile) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    )
  }

  const unverified = needsEmailVerification(profile)

  const handleSendVerify = async () => {
    if (sending || cooldown > 0) return
    setSending(true)
    try {
      await sendEmailVerifyLink()
      setCooldown(60)
      appToast.success('验证邮件已发送，请查收并点击链接完成验证')
      onVerified?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {unverified ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3.5 dark:border-amber-700/60 dark:bg-amber-950/40">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                邮箱尚未验证
              </p>
              <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/90">
                验证邮箱后可使用完整功能。点击下方按钮，我们将向{' '}
                <span className="font-medium">{profile.email || '您的邮箱'}</span>{' '}
                发送验证邮件，点击邮件中的链接即可完成验证。
              </p>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                disabled={sending || cooldown > 0}
                onClick={() => void handleSendVerify()}
              >
                {sending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 size-3.5" />
                )}
                {cooldown > 0 ? `${cooldown}s 后可重发` : '发送验证邮件'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <InfoRow label="用户名" value={profile.username || '—'} />
        <InfoRow label="邮箱" value={profile.email || '—'} />
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">角色</span>
          <Badge variant="secondary">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
        </div>
        {profile.emailVerified != null ? (
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">邮箱验证</span>
            <Badge variant={profile.emailVerified ? 'default' : 'outline'}>
              {profile.emailVerified ? '已验证' : '未验证'}
            </Badge>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
