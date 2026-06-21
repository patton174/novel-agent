import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Mail } from 'lucide-react'
import { sendEmailVerifyLink, needsEmailVerification } from '@/api/userApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { APP_BTN_SM } from '@/lib/appButtonTokens'
import { Skeleton } from '@/components/ui/skeleton'
import { appToast } from '@/stores/appToastStore'
import type { UserProfile } from '@/stores/userStore'
import { useTranslation } from 'react-i18next'
import { UserPixelAvatar } from '@/components/avatars/PixelAvatar'
import { PixelAvatarFrame } from '@/components/avatars/PixelAvatarFrame'
import { cn } from '@/lib/utils'

interface AccountSettingsPanelProps {
  profile: UserProfile | null
  onVerified?: () => void
  onOpenAvatarEditor?: () => void
}

export function AccountSettingsPanel({ profile, onVerified, onOpenAvatarEditor }: AccountSettingsPanelProps) {
  const { t } = useTranslation(['dashboard'])
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inflightRef = useRef(false)

  const ROLE_LABELS: Record<string, string> = {
    user: t('dashboard:account.roleUser'),
    vip: t('dashboard:account.roleVip'),
    admin: t('dashboard:account.roleAdmin'),
  }

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
    if (sending || cooldown > 0 || inflightRef.current) return
    inflightRef.current = true
    setSending(true)
    try {
      await sendEmailVerifyLink()
      setCooldown(60)
      appToast.success(t('dashboard:account.verifySent'))
      onVerified?.()
    } catch (err) {
      appToast.error(err instanceof Error ? err.message : t('dashboard:account.sendFail'))
    } finally {
      inflightRef.current = false
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Avatar display above username form */}
      {onOpenAvatarEditor && (
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-left',
            'transition-colors hover:border-border hover:bg-muted/35',
          )}
          onClick={onOpenAvatarEditor}
        >
          <PixelAvatarFrame size={48} bordered={false}>
            <UserPixelAvatar size={44} animated />
          </PixelAvatarFrame>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-foreground">{t('editor:avatar.sectionTitle', '头像')}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{t('editor:avatar.entryHint', '点击更换头像')}</p>
          </div>
        </button>
      )}
      {unverified ? (
        <div className="rounded-xl border border-sky-300/80 bg-sky-50 px-4 py-3.5 dark:border-sky-700/60 dark:bg-sky-950/40">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                {t('dashboard:account.unverifiedTitle')}
              </p>
              <p className="text-xs leading-relaxed text-sky-800/90 dark:text-sky-200/90">
                {t('dashboard:account.unverifiedDesc1')}
                <span className="font-medium">{profile.email || t('dashboard:account.unverifiedDesc2')}</span>{' '}
                {t('dashboard:account.unverifiedDesc3')}
              </p>
              <Button
                type="button"
                size="sm"
                className={`bg-sky-600 text-white hover:bg-sky-700 ${APP_BTN_SM}`}
                disabled={sending || cooldown > 0}
                onClick={() => void handleSendVerify()}
              >
                {sending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 size-3.5" />
                )}
                {cooldown > 0 ? `${cooldown}${t('dashboard:account.resendCooldown')}` : t('dashboard:account.sendVerify')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <InfoRow label={t('dashboard:account.username')} value={profile.username || '—'} />
        <InfoRow label={t('dashboard:account.email')} value={profile.email || '—'} />
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">{t('dashboard:account.role')}</span>
          <Badge variant="secondary" className="bg-muted text-foreground ring-1 ring-border/60">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </Badge>
        </div>
        {profile.email ? (
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">{t('dashboard:account.emailVerify')}</span>
            <Badge
              variant={profile.emailVerified === true ? 'default' : 'outline'}
              className={
                profile.emailVerified === true
                  ? 'border-emerald-600/30 bg-emerald-600 text-white hover:bg-emerald-600'
                  : 'border-sky-500/50 bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100'
              }
            >
              {profile.emailVerified === true ? t('dashboard:account.verified') : t('dashboard:account.unverified')}
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
