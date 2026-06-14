import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { fetchUserInfo } from '@/api/userApi'
import { AccountSettingsSections } from '@/components/dashboard/AccountSettingsSections'
import { SettingsFeedbackCard } from '@/components/dashboard/SettingsFeedbackCard'
import {
  AppPageIntro,
  AppPageStack,
  AppShellCard,
  AppShellCardBody,
  AppShellCardHeader,
} from '@/components/layout/AppPageStack'
import { InlineTitleSkeleton } from '@/components/loading/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useMarkRouteSeen } from '@/hooks/useMarkRouteSeen'
import { useUserStore } from '@/stores/userStore'
import type { UserProfile } from '@/stores/userStore'

import { useTranslation } from 'react-i18next'

export default function SettingsPage() {
  const { t } = useTranslation(['dashboard'])
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
        eyebrow={t('dashboard:settings.eyebrow')}
        title={loading ? <InlineTitleSkeleton /> : profile?.username ?? t('dashboard:settings.defaultTitle')}
        icon={Settings}
      />

      <AppShellCard>
        <AppShellCardHeader title={t('dashboard:settings.accountTitle')} description={t('dashboard:settings.accountDesc')} />
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

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.feedbackTitle')}
          description={t('dashboard:settings.feedbackDesc')}
        />
        <AppShellCardBody>
          <SettingsFeedbackCard />
        </AppShellCardBody>
      </AppShellCard>

      <AppShellCard>
        <AppShellCardHeader title={t('dashboard:settings.themeTitle')} description={t('dashboard:settings.themeDesc')} />
        <AppShellCardBody>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t('dashboard:settings.uiTheme')}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard:settings.themeHint')}</p>
            </div>
            <ThemeToggle />
          </div>
        </AppShellCardBody>
      </AppShellCard>
    </AppPageStack>
  )
}
