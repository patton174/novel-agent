import { useState } from 'react'
import { Settings } from 'lucide-react'
import { AccountSettingsSections } from '@/components/dashboard/AccountSettingsSections'
import { SettingsFeedbackCard } from '@/components/dashboard/SettingsFeedbackCard'
import { PixelAvatarModal } from '@/components/avatars/PixelAvatarModal'
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

/** 账户设置 — 手机：单列卡片栈（账户 / 反馈 / 主题）。 */
export function SettingsMobile() {
  const { t } = useTranslation(['dashboard'])
  const { profile, loading, onVerified } = useSettings()
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  return (
    <AppPageStack compact>
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
            <AccountSettingsSections
              profile={profile}
              onVerified={onVerified}
              onOpenAvatarEditor={() => setAvatarModalOpen(true)}
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

      <PixelAvatarModal open={avatarModalOpen} onClose={() => setAvatarModalOpen(false)} />
    </AppPageStack>
  )
}
