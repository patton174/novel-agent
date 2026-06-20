import { Settings } from 'lucide-react'
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
import { useTranslation } from 'react-i18next'
import { useSettings } from './useSettings'

/** 账户设置 — 桌面：账户卡全宽 + 反馈/主题双栏。复用既有子组件，不改写表单。 */
export function SettingsDesktop() {
  const { t } = useTranslation(['dashboard'])
  const { profile, loading, onVerified } = useSettings()

  return (
    <AppPageStack>
      <AppPageIntro
        eyebrow={t('dashboard:settings.eyebrow')}
        title={
          loading ? (
            <InlineTitleSkeleton />
          ) : (
            profile?.username ?? t('dashboard:settings.defaultTitle')
          )
        }
        icon={Settings}
      />

      <AppShellCard>
        <AppShellCardHeader
          title={t('dashboard:settings.accountTitle')}
          description={t('dashboard:settings.accountDesc')}
        />
        <AppShellCardBody>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : (
            <AccountSettingsSections profile={profile} onVerified={onVerified} variant="page" />
          )}
        </AppShellCardBody>
      </AppShellCard>

      <div className="grid gap-6 lg:grid-cols-2">
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
          <AppShellCardHeader
            title={t('dashboard:settings.themeTitle')}
            description={t('dashboard:settings.themeDesc')}
          />
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
      </div>
    </AppPageStack>
  )
}
